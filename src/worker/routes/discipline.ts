/**
 * Discipline Routes
 *
 * Iron-Fist 3-Loss Lockout System
 * - Check consecutive losses and trigger lockout
 * - Get lockout status
 * - Admin force unlock
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { D1Database } from '@cloudflare/workers-types';

// ============================================================================
// IRON-FIST DISCIPLINE - 3-Loss Lockout System
// ============================================================================

type Env = {
  DB: D1Database;
  ADMIN_API_KEY?: string;
};

interface UserVariable {
  google_user_data?: {
    sub: string;
    email?: string;
    name?: string;
  };
  firebase_user_id?: string;
  email?: string;
}

export const discipline = new Hono<{ Bindings: Env; Variables: { user: UserVariable } }>();

// Lockout duration: 8 hours in seconds
const LOCKOUT_DURATION_SECONDS = 8 * 60 * 60;

// Number of consecutive losses to trigger lockout
const CONSECUTIVE_LOSSES_THRESHOLD = 3;

// Firebase auth middleware - supports both Bearer token and cookie
const firebaseAuthMiddleware = async (c: unknown, next: () => Promise<void>) => {
  const context = c as {
    get: (key: string) => UserVariable | undefined;
    set: (key: string, value: UserVariable) => void;
    json: (data: { error: string }, status: number) => Response;
    req: { header: (name: string) => string | undefined };
  };

  // Try Bearer token first (from Authorization header)
  const authHeader = context.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      // Decode Firebase JWT token (base64url decode the payload)
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const base64Url = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
        const base64 = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
        const payload = JSON.parse(atob(base64)) as { sub?: string; user_id?: string; email?: string; name?: string };

        const userId = payload.sub || payload.user_id;
        if (userId) {
          context.set('user', {
            google_user_data: {
              sub: userId,
              email: payload.email,
              name: payload.name,
            },
            firebase_user_id: userId,
            email: payload.email,
          });
          return next();
        }
      }
    } catch (error) {
      console.error('Error decoding Bearer token:', error);
    }
  }

  // Try Firebase session cookie
  const firebaseSession = getCookie(context as Parameters<typeof getCookie>[0], 'firebase_session');
  if (firebaseSession) {
    try {
      const userData = JSON.parse(firebaseSession) as { google_user_id?: string; sub?: string; email?: string; name?: string };
      context.set('user', {
        google_user_data: {
          sub: userData.google_user_id || userData.sub || '',
          email: userData.email,
          name: userData.name,
        },
        firebase_user_id: userData.google_user_id || userData.sub,
        email: userData.email,
      });
      return next();
    } catch (error) {
      console.error('Error parsing Firebase session:', error);
    }
  }

  return context.json({ error: 'Unauthorized' }, 401);
};

/**
 * POST /api/discipline/check-lockdown
 *
 * Check if user should be locked out based on 3 consecutive losses.
 * Called after each trade close.
 */
discipline.post('/check-lockdown', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    // Fetch last 3 closed trades for user, ordered by close time descending
    const trades = await c.env.DB.prepare(`
      SELECT id, pnl, exit_date
      FROM trades
      WHERE user_id = ? AND status = 'closed' AND pnl IS NOT NULL
      ORDER BY exit_date DESC, created_at DESC
      LIMIT ?
    `).bind(userId, CONSECUTIVE_LOSSES_THRESHOLD).all();

    // Not enough trades to trigger lockout
    if (!trades.results || trades.results.length < CONSECUTIVE_LOSSES_THRESHOLD) {
      return c.json({
        lockout: false,
        message: 'Not enough trades to evaluate',
        tradesChecked: trades.results?.length || 0,
        threshold: CONSECUTIVE_LOSSES_THRESHOLD
      });
    }

    // Check if all 3 trades are losses (pnl < 0)
    const allLosses = trades.results.every((trade: unknown) => {
      const t = trade as { pnl: number | string | null };
      return t.pnl !== null && parseFloat(String(t.pnl)) < 0;
    });

    if (!allLosses) {
      return c.json({
        lockout: false,
        message: 'Not all recent trades are losses',
        tradesChecked: CONSECUTIVE_LOSSES_THRESHOLD
      });
    }

    // All 3 trades are losses - trigger lockout
    const now = Math.floor(Date.now() / 1000);
    const lockoutUntil = now + LOCKOUT_DURATION_SECONDS;

    // Update user's lockout status
    await c.env.DB.prepare(`
      UPDATE users SET lockout_until = ? WHERE google_user_id = ?
    `).bind(lockoutUntil, userId).run();

    // Log discipline event
    const eventId = crypto.randomUUID();
    const triggerTradeIds = trades.results.map((t: unknown) => (t as { id: string }).id).join(',');

    // Try to insert into discipline_events table (may not exist yet)
    try {
      await c.env.DB.prepare(`
        INSERT INTO discipline_events (id, user_id, event_type, trigger_trades, lockout_until, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(eventId, userId, 'lockout_triggered', triggerTradeIds, lockoutUntil, now).run();
    } catch (tableError) {
      console.log('discipline_events table may not exist yet:', tableError);
    }

    const lockoutDate = new Date(lockoutUntil * 1000);

    return c.json({
      lockout: true,
      message: '3 consecutive losses detected - lockout activated',
      lockoutUntil: lockoutDate.toISOString(),
      lockoutUntilTimestamp: lockoutUntil,
      durationHours: LOCKOUT_DURATION_SECONDS / 3600,
      triggerTrades: triggerTradeIds.split(','),
      eventId
    });

  } catch (error) {
    console.error('Check lockdown error:', error);
    return c.json({
      error: 'Failed to check lockdown status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/discipline/status
 *
 * Get current lockout status for authenticated user.
 */
discipline.get('/status', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    // Get user's lockout status
    const dbUser = await c.env.DB.prepare(`
      SELECT lockout_until FROM users WHERE google_user_id = ?
    `).bind(userId).first();

    const now = Math.floor(Date.now() / 1000);

    if (!dbUser?.lockout_until) {
      return c.json({
        isLockedOut: false,
        message: 'No active lockout'
      });
    }

    const lockoutUntil = dbUser.lockout_until as number;

    if (lockoutUntil <= now) {
      // Lockout has expired
      return c.json({
        isLockedOut: false,
        message: 'Lockout expired',
        expiredAt: new Date(lockoutUntil * 1000).toISOString()
      });
    }

    // User is currently locked out
    const remainingSeconds = lockoutUntil - now;
    const remainingHours = Math.floor(remainingSeconds / 3600);
    const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);

    // Try to get the discipline event that triggered this lockout
    let event = null;
    try {
      event = await c.env.DB.prepare(`
        SELECT id, trigger_trades, created_at
        FROM discipline_events
        WHERE user_id = ? AND event_type = 'lockout_triggered' AND resolved_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(userId).first();
    } catch (tableError) {
      console.log('discipline_events table may not exist yet:', tableError);
    }

    return c.json({
      isLockedOut: true,
      lockoutUntil: new Date(lockoutUntil * 1000).toISOString(),
      lockoutUntilTimestamp: lockoutUntil,
      remainingSeconds,
      remainingFormatted: `${remainingHours}h ${remainingMinutes}m`,
      triggerTrades: event?.trigger_trades ? (event.trigger_trades as string).split(',') : [],
      eventId: event?.id || null
    });

  } catch (error) {
    console.error('Get status error:', error);
    return c.json({
      error: 'Failed to get lockout status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/discipline/force-unlock
 *
 * Admin-only emergency unlock.
 * Requires X-Admin-Key header with valid admin API key.
 */
discipline.post('/force-unlock', async (c) => {
  try {
    // Check admin key
    const adminKey = c.req.header('X-Admin-Key');
    const validAdminKey = c.env.ADMIN_API_KEY;

    if (!validAdminKey) {
      return c.json({ error: 'Admin API key not configured' }, 500);
    }

    if (!adminKey || adminKey !== validAdminKey) {
      return c.json({ error: 'Unauthorized - Invalid admin key' }, 401);
    }

    const body = await c.req.json() as { userId?: string; reason?: string };
    const { userId, reason } = body;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    if (!reason) {
      return c.json({ error: 'reason is required for audit trail' }, 400);
    }

    // Check if user exists and is locked out
    const dbUser = await c.env.DB.prepare(`
      SELECT lockout_until FROM users WHERE google_user_id = ?
    `).bind(userId).first();

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);

    if (!dbUser.lockout_until || (dbUser.lockout_until as number) <= now) {
      return c.json({
        error: 'User is not currently locked out',
        message: 'No action needed'
      }, 400);
    }

    // Remove lockout
    await c.env.DB.prepare(`
      UPDATE users SET lockout_until = NULL WHERE google_user_id = ?
    `).bind(userId).run();

    // Mark discipline event as resolved
    try {
      await c.env.DB.prepare(`
        UPDATE discipline_events
        SET resolved_at = ?
        WHERE user_id = ? AND event_type = 'lockout_triggered' AND resolved_at IS NULL
      `).bind(now, userId).run();
    } catch (tableError) {
      console.log('discipline_events table may not exist yet:', tableError);
    }

    // Log admin action
    const actionId = crypto.randomUUID();
    try {
      await c.env.DB.prepare(`
        INSERT INTO admin_actions (id, admin_key, action_type, target_user_id, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(actionId, adminKey.substring(0, 8) + '...', 'force_unlock', userId, reason, now).run();
    } catch (tableError) {
      console.log('admin_actions table may not exist yet:', tableError);
    }

    return c.json({
      success: true,
      message: 'User has been unlocked',
      userId,
      reason,
      actionId,
      unlockedAt: new Date(now * 1000).toISOString()
    });

  } catch (error) {
    console.error('Force unlock error:', error);
    return c.json({
      error: 'Failed to force unlock',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/discipline/history
 *
 * Get lockout history for authenticated user.
 */
discipline.get('/history', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    try {
      const events = await c.env.DB.prepare(`
        SELECT id, event_type, trigger_trades, lockout_until, created_at, resolved_at
        FROM discipline_events
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).bind(userId).all();

      return c.json({
        events: events.results?.map((event: unknown) => {
          const e = event as {
            id: string;
            event_type: string;
            trigger_trades: string | null;
            lockout_until: number | null;
            created_at: number;
            resolved_at: number | null;
          };
          return {
            id: e.id,
            eventType: e.event_type,
            triggerTrades: e.trigger_trades ? e.trigger_trades.split(',') : [],
            lockoutUntil: e.lockout_until ? new Date(e.lockout_until * 1000).toISOString() : null,
            createdAt: new Date(e.created_at * 1000).toISOString(),
            resolvedAt: e.resolved_at ? new Date(e.resolved_at * 1000).toISOString() : null,
            wasForceUnlocked: e.resolved_at !== null
          };
        }) || [],
        totalCount: events.results?.length || 0
      });
    } catch (tableError) {
      // Table doesn't exist yet, return empty history
      console.log('discipline_events table may not exist yet:', tableError);
      return c.json({
        events: [],
        totalCount: 0,
        message: 'No lockout history available'
      });
    }

  } catch (error) {
    console.error('Get history error:', error);
    return c.json({
      error: 'Failed to get lockout history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
