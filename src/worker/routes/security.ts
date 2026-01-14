/**
 * Security Routes (Anti-Phishing Code & Device Management)
 *
 * Endpoints:
 * - GET  /api/security/anti-phishing - Get anti-phishing code status
 * - POST /api/security/anti-phishing - Set/Update anti-phishing code
 * - DELETE /api/security/anti-phishing - Remove anti-phishing code
 * - GET  /api/security/devices - Get all devices
 * - DELETE /api/security/devices/:deviceId - Remove a device
 * - POST /api/security/devices/:deviceId/trust - Trust/Untrust a device
 * - GET  /api/security/login-history - Get login history
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

export const securityRouter = new Hono<{ Bindings: Env; Variables: { user: UserVariable } }>();

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

// ============================================
// Anti-Phishing Code Routes
// ============================================

/**
 * GET /api/security/anti-phishing
 * Get current anti-phishing code (masked)
 */
securityRouter.get('/anti-phishing', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const dbUser = await c.env.DB.prepare(`
      SELECT anti_phishing_code
      FROM users
      WHERE google_user_id = ?
    `).bind(userId).first();

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const code = dbUser.anti_phishing_code as string | null;

    return c.json({
      enabled: !!code,
      // Return masked version for display (e.g., "MyS***123")
      maskedCode: code ? maskCode(code) : null
    });

  } catch (error) {
    console.error('Get anti-phishing error:', error);
    return c.json({
      error: 'Failed to get anti-phishing code',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/security/anti-phishing
 * Set or update anti-phishing code
 * Body: { code: string }
 */
securityRouter.post('/anti-phishing', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const body = await c.req.json() as { code?: string };
    const { code } = body;

    if (!code || code.trim().length === 0) {
      return c.json({ error: 'Anti-phishing code is required' }, 400);
    }

    if (code.length > 20) {
      return c.json({ error: 'Anti-phishing code must be 20 characters or less' }, 400);
    }

    // Update anti-phishing code
    await c.env.DB.prepare(`
      UPDATE users
      SET anti_phishing_code = ?
      WHERE google_user_id = ?
    `).bind(code.trim(), userId).run();

    return c.json({
      success: true,
      message: 'Anti-phishing code saved successfully',
      maskedCode: maskCode(code.trim())
    });

  } catch (error) {
    console.error('Set anti-phishing error:', error);
    return c.json({
      error: 'Failed to save anti-phishing code',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * DELETE /api/security/anti-phishing
 * Remove anti-phishing code
 */
securityRouter.delete('/anti-phishing', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    await c.env.DB.prepare(`
      UPDATE users
      SET anti_phishing_code = NULL
      WHERE google_user_id = ?
    `).bind(userId).run();

    return c.json({
      success: true,
      message: 'Anti-phishing code removed'
    });

  } catch (error) {
    console.error('Delete anti-phishing error:', error);
    return c.json({
      error: 'Failed to remove anti-phishing code',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================
// Device Management Routes
// ============================================

/**
 * GET /api/security/devices
 * Get all registered devices for the user
 */
securityRouter.get('/devices', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const devices = await c.env.DB.prepare(`
      SELECT
        id,
        device_id,
        device_name,
        device_type,
        browser,
        os,
        ip_address,
        location,
        is_trusted,
        last_active_at,
        created_at
      FROM user_devices
      WHERE user_id = ?
      ORDER BY last_active_at DESC
    `).bind(userId).all();

    return c.json({
      devices: devices.results || []
    });

  } catch (error) {
    console.error('Get devices error:', error);
    return c.json({
      error: 'Failed to get devices',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/security/devices/register
 * Register current device
 * Body: { deviceName?: string, deviceType?: string, browser?: string, os?: string }
 */
securityRouter.post('/devices/register', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const body = await c.req.json() as {
      deviceId?: string;
      deviceName?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
    };

    // Generate device ID if not provided
    const deviceId = body.deviceId || generateDeviceId();
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

    // Upsert device
    await c.env.DB.prepare(`
      INSERT INTO user_devices (user_id, device_id, device_name, device_type, browser, os, ip_address, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, device_id) DO UPDATE SET
        device_name = excluded.device_name,
        browser = excluded.browser,
        os = excluded.os,
        ip_address = excluded.ip_address,
        last_active_at = CURRENT_TIMESTAMP
    `).bind(
      userId,
      deviceId,
      body.deviceName || 'Unknown Device',
      body.deviceType || 'desktop',
      body.browser || 'Unknown',
      body.os || 'Unknown',
      ipAddress
    ).run();

    return c.json({
      success: true,
      deviceId,
      message: 'Device registered'
    });

  } catch (error) {
    console.error('Register device error:', error);
    return c.json({
      error: 'Failed to register device',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * DELETE /api/security/devices/:deviceId
 * Remove a device
 */
securityRouter.delete('/devices/:deviceId', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const deviceId = c.req.param('deviceId');

    await c.env.DB.prepare(`
      DELETE FROM user_devices
      WHERE user_id = ? AND device_id = ?
    `).bind(userId, deviceId).run();

    return c.json({
      success: true,
      message: 'Device removed'
    });

  } catch (error) {
    console.error('Delete device error:', error);
    return c.json({
      error: 'Failed to remove device',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/security/devices/:deviceId/trust
 * Toggle trust status for a device
 * Body: { trusted: boolean }
 */
securityRouter.post('/devices/:deviceId/trust', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const deviceId = c.req.param('deviceId');
    const body = await c.req.json() as { trusted?: boolean };

    await c.env.DB.prepare(`
      UPDATE user_devices
      SET is_trusted = ?
      WHERE user_id = ? AND device_id = ?
    `).bind(body.trusted ? 1 : 0, userId, deviceId).run();

    return c.json({
      success: true,
      message: body.trusted ? 'Device trusted' : 'Device untrusted'
    });

  } catch (error) {
    console.error('Trust device error:', error);
    return c.json({
      error: 'Failed to update device trust',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================
// Login History Routes
// ============================================

/**
 * GET /api/security/login-history
 * Get login history for the user
 */
securityRouter.get('/login-history', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '20');

    const history = await c.env.DB.prepare(`
      SELECT
        id,
        device_id,
        ip_address,
        location,
        status,
        failure_reason,
        created_at
      FROM login_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(userId, limit).all();

    return c.json({
      history: history.results || []
    });

  } catch (error) {
    console.error('Get login history error:', error);
    return c.json({
      error: 'Failed to get login history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================
// Helper Functions
// ============================================

function maskCode(code: string): string {
  if (code.length <= 4) {
    return code.charAt(0) + '***';
  }
  const visibleStart = Math.ceil(code.length / 4);
  const visibleEnd = Math.ceil(code.length / 4);
  return code.slice(0, visibleStart) + '***' + code.slice(-visibleEnd);
}

function generateDeviceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(16);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 16; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
