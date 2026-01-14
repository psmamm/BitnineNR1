/**
 * Two-Factor Authentication (2FA) Routes
 *
 * Endpoints:
 * - GET  /api/2fa/status - Get 2FA status for current user
 * - POST /api/2fa/setup - Generate TOTP secret and QR URI
 * - POST /api/2fa/verify - Verify TOTP code and enable 2FA
 * - POST /api/2fa/disable - Disable 2FA (requires code verification)
 * - POST /api/2fa/validate - Validate TOTP code (for login)
 * - POST /api/2fa/backup-codes/regenerate - Generate new backup codes
 * - POST /api/2fa/backup-codes/verify - Verify and consume a backup code
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { D1Database } from '@cloudflare/workers-types';
import {
  generateTOTPSecret,
  generateTOTPUri,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode
} from '../utils/totp';

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

export const twoFactorRouter = new Hono<{ Bindings: Env; Variables: { user: UserVariable } }>();

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
 * GET /api/2fa/status
 * Get current 2FA status for the authenticated user
 */
twoFactorRouter.get('/status', firebaseAuthMiddleware, async (c) => {
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
      SELECT two_factor_enabled, two_factor_enabled_at
      FROM users
      WHERE google_user_id = ?
    `).bind(userId).first();

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      enabled: dbUser.two_factor_enabled === 1,
      enabledAt: dbUser.two_factor_enabled_at || null
    });

  } catch (error) {
    console.error('2FA status error:', error);
    return c.json({
      error: 'Failed to get 2FA status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/2fa/setup
 * Generate a new TOTP secret and return QR code URI
 * Does NOT enable 2FA - user must verify first
 */
twoFactorRouter.post('/setup', firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    const userEmail = user.email || user.google_user_data?.email;

    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    // Check if 2FA is already enabled
    const dbUser = await c.env.DB.prepare(`
      SELECT two_factor_enabled, two_factor_secret
      FROM users
      WHERE google_user_id = ?
    `).bind(userId).first();

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (dbUser.two_factor_enabled === 1) {
      return c.json({ error: '2FA is already enabled. Disable it first to set up again.' }, 400);
    }

    // Generate new TOTP secret
    const secret = await generateTOTPSecret();

    // Generate QR code URI
    const qrUri = generateTOTPUri(secret, userEmail || 'user@circl.app', 'CIRCL');

    // Store the secret temporarily (not enabled yet)
    await c.env.DB.prepare(`
      UPDATE users
      SET two_factor_secret = ?
      WHERE google_user_id = ?
    `).bind(secret, userId).run();

    return c.json({
      success: true,
      secret,
      qrUri,
      message: 'Scan the QR code with your authenticator app, then verify with a code'
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return c.json({
      error: 'Failed to setup 2FA',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/2fa/verify
 * Verify TOTP code and enable 2FA
 * Body: { code: string }
 */
twoFactorRouter.post('/verify', firebaseAuthMiddleware, async (c) => {
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

    if (!code || code.length !== 6) {
      return c.json({ error: 'Invalid code. Must be 6 digits.' }, 400);
    }

    // Get user's pending secret
    const dbUser = await c.env.DB.prepare(`
      SELECT two_factor_enabled, two_factor_secret
      FROM users
      WHERE google_user_id = ?
    `).bind(userId).first();

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (dbUser.two_factor_enabled === 1) {
      return c.json({ error: '2FA is already enabled' }, 400);
    }

    if (!dbUser.two_factor_secret) {
      return c.json({ error: 'No 2FA setup in progress. Call /api/2fa/setup first.' }, 400);
    }

    // Verify the code
    const isValid = await verifyTOTP(dbUser.two_factor_secret as string, code);

    if (!isValid) {
      return c.json({ error: 'Invalid code. Please try again.' }, 400);
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(8);
    const hashedBackupCodes: string[] = [];

    for (const backupCode of backupCodes) {
      const hashed = await hashBackupCode(backupCode);
      hashedBackupCodes.push(hashed);
    }

    // Enable 2FA
    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      UPDATE users
      SET two_factor_enabled = 1,
          two_factor_backup_codes = ?,
          two_factor_enabled_at = ?
      WHERE google_user_id = ?
    `).bind(JSON.stringify(hashedBackupCodes), now, userId).run();

    return c.json({
      success: true,
      message: '2FA has been enabled successfully',
      backupCodes,
      warning: 'Save these backup codes in a safe place. They will not be shown again!'
    });

  } catch (error) {
    console.error('2FA verify error:', error);
    return c.json({
      error: 'Failed to verify 2FA',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/2fa/disable
 * Disable 2FA (requires current TOTP code or backup code)
 * Body: { code: string }
 */
twoFactorRouter.post('/disable', firebaseAuthMiddleware, async (c) => {
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

    if (!code) {
      return c.json({ error: 'Code is required to disable 2FA' }, 400);
    }

    // Get user's 2FA status
    const dbUser = await c.env.DB.prepare(`
      SELECT two_factor_enabled, two_factor_secret, two_factor_backup_codes
      FROM users
      WHERE google_user_id = ?
    `).bind(userId).first();

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (dbUser.two_factor_enabled !== 1) {
      return c.json({ error: '2FA is not enabled' }, 400);
    }

    // Try TOTP code first
    let isValid = false;
    if (code.length === 6 && /^\d+$/.test(code)) {
      isValid = await verifyTOTP(dbUser.two_factor_secret as string, code);
    }

    // If not valid, try backup code
    if (!isValid && dbUser.two_factor_backup_codes) {
      const hashedCodes = JSON.parse(dbUser.two_factor_backup_codes as string) as string[];
      const backupResult = await verifyBackupCode(code, hashedCodes);
      isValid = backupResult.valid;
    }

    if (!isValid) {
      return c.json({ error: 'Invalid code. Please try again.' }, 400);
    }

    // Disable 2FA
    await c.env.DB.prepare(`
      UPDATE users
      SET two_factor_enabled = 0,
          two_factor_secret = NULL,
          two_factor_backup_codes = NULL,
          two_factor_enabled_at = NULL
      WHERE google_user_id = ?
    `).bind(userId).run();

    return c.json({
      success: true,
      message: '2FA has been disabled successfully'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    return c.json({
      error: 'Failed to disable 2FA',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/2fa/validate
 * Validate a TOTP code (used during login)
 * Body: { userId: string, code: string }
 * Note: This endpoint does NOT require authentication (used during login flow)
 */
twoFactorRouter.post('/validate', async (c) => {
  try {
    const body = await c.req.json() as { userId?: string; code?: string };
    const { userId, code } = body;

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    if (!code) {
      return c.json({ error: 'Code is required' }, 400);
    }

    // Get user's 2FA secret
    const dbUser = await c.env.DB.prepare(`
      SELECT two_factor_enabled, two_factor_secret, two_factor_backup_codes
      FROM users
      WHERE google_user_id = ?
    `).bind(userId).first();

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (dbUser.two_factor_enabled !== 1) {
      return c.json({
        valid: true,
        message: '2FA is not enabled for this user',
        twoFactorRequired: false
      });
    }

    // Try TOTP code first
    let isValid = false;
    let usedBackupCode = false;

    if (code.length === 6 && /^\d+$/.test(code)) {
      isValid = await verifyTOTP(dbUser.two_factor_secret as string, code);
    }

    // If not valid, try backup code
    if (!isValid && dbUser.two_factor_backup_codes) {
      const hashedCodes = JSON.parse(dbUser.two_factor_backup_codes as string) as string[];
      const backupResult = await verifyBackupCode(code, hashedCodes);

      if (backupResult.valid) {
        isValid = true;
        usedBackupCode = true;

        // Remove used backup code
        hashedCodes.splice(backupResult.index, 1);
        await c.env.DB.prepare(`
          UPDATE users
          SET two_factor_backup_codes = ?
          WHERE google_user_id = ?
        `).bind(JSON.stringify(hashedCodes), userId).run();
      }
    }

    if (!isValid) {
      return c.json({
        valid: false,
        error: 'Invalid code',
        twoFactorRequired: true
      }, 401);
    }

    return c.json({
      valid: true,
      message: usedBackupCode ? 'Backup code used successfully' : '2FA verified',
      usedBackupCode,
      remainingBackupCodes: usedBackupCode ?
        (JSON.parse(dbUser.two_factor_backup_codes as string) as string[]).length - 1 : undefined
    });

  } catch (error) {
    console.error('2FA validate error:', error);
    return c.json({
      error: 'Failed to validate 2FA',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/2fa/backup-codes/regenerate
 * Generate new backup codes (invalidates old ones)
 * Body: { code: string } - requires current TOTP code
 */
twoFactorRouter.post('/backup-codes/regenerate', firebaseAuthMiddleware, async (c) => {
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

    if (!code || code.length !== 6) {
      return c.json({ error: 'Valid TOTP code is required' }, 400);
    }

    // Get user's 2FA status
    const dbUser = await c.env.DB.prepare(`
      SELECT two_factor_enabled, two_factor_secret
      FROM users
      WHERE google_user_id = ?
    `).bind(userId).first();

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (dbUser.two_factor_enabled !== 1) {
      return c.json({ error: '2FA is not enabled' }, 400);
    }

    // Verify TOTP code
    const isValid = await verifyTOTP(dbUser.two_factor_secret as string, code);

    if (!isValid) {
      return c.json({ error: 'Invalid code. Please try again.' }, 400);
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(8);
    const hashedBackupCodes: string[] = [];

    for (const backupCode of backupCodes) {
      const hashed = await hashBackupCode(backupCode);
      hashedBackupCodes.push(hashed);
    }

    // Update backup codes
    await c.env.DB.prepare(`
      UPDATE users
      SET two_factor_backup_codes = ?
      WHERE google_user_id = ?
    `).bind(JSON.stringify(hashedBackupCodes), userId).run();

    return c.json({
      success: true,
      message: 'New backup codes generated. Old codes are now invalid.',
      backupCodes,
      warning: 'Save these backup codes in a safe place. They will not be shown again!'
    });

  } catch (error) {
    console.error('Backup codes regenerate error:', error);
    return c.json({
      error: 'Failed to regenerate backup codes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
