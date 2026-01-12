/**
 * Trading Bots API Routes
 *
 * Handles trading bot management:
 * - List user's bots
 * - Create new bots
 * - Start/Stop/Pause bots
 * - Get bot performance metrics
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { D1Database } from '@cloudflare/workers-types';

type Env = {
  DB: D1Database;
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

export const botsRouter = new Hono<{ Bindings: Env; Variables: { user: UserVariable } }>();

// Firebase auth middleware
const firebaseAuthMiddleware = async (c: unknown, next: () => Promise<void>) => {
  const context = c as {
    get: (key: string) => UserVariable | undefined;
    set: (key: string, value: UserVariable) => void;
    json: (data: { error: string }, status: number) => Response;
    req: { header: (name: string) => string | undefined };
  };

  // Try Bearer token first
  const authHeader = context.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
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
      console.error('[Bots API] Error decoding Bearer token:', error);
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
      console.error('[Bots API] Error parsing Firebase session:', error);
    }
  }

  return context.json({ error: 'Unauthorized' }, 401);
};

/**
 * GET /api/bots
 *
 * Get all trading bots for authenticated user
 */
botsRouter.get('/', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    console.log('[Bots API] Fetching bots for user:', userId);

    // MVP: Return empty array (bots table not created yet)
    // TODO: Implement actual bot fetching when bots table is created
    return c.json({
      bots: [],
      message: 'Trading bots feature coming soon!'
    });

  } catch (error) {
    console.error('[Bots API] Error fetching bots:', error);
    return c.json({
      error: 'Failed to fetch trading bots',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/bots
 *
 * Create a new trading bot
 * TODO: Implement when bots table is ready
 */
botsRouter.post('/', firebaseAuthMiddleware, async (c) => {
  return c.json({
    error: 'Trading bot creation not implemented yet',
    message: 'Feature coming soon!'
  }, 501);
});

/**
 * PUT /api/bots/:id/start
 *
 * Start a trading bot
 * TODO: Implement when bots table is ready
 */
botsRouter.put('/:id/start', firebaseAuthMiddleware, async (c) => {
  return c.json({
    error: 'Trading bot start not implemented yet',
    message: 'Feature coming soon!'
  }, 501);
});

/**
 * PUT /api/bots/:id/pause
 *
 * Pause a trading bot
 * TODO: Implement when bots table is ready
 */
botsRouter.put('/:id/pause', firebaseAuthMiddleware, async (c) => {
  return c.json({
    error: 'Trading bot pause not implemented yet',
    message: 'Feature coming soon!'
  }, 501);
});

/**
 * DELETE /api/bots/:id
 *
 * Delete a trading bot
 * TODO: Implement when bots table is ready
 */
botsRouter.delete('/:id', firebaseAuthMiddleware, async (c) => {
  return c.json({
    error: 'Trading bot deletion not implemented yet',
    message: 'Feature coming soon!'
  }, 501);
});
