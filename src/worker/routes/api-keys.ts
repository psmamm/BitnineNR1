/**
 * API Keys Management Route
 * 
 * Handles secure storage and retrieval of broker API keys using AEAD encryption.
 * Keys are encrypted at rest and only decrypted in RAM during order execution.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getCookie } from "hono/cookie";
import { D1Database } from "@cloudflare/workers-types";
import { encrypt, decrypt } from "../utils/encryption";

type Env = {
  ENCRYPTION_MASTER_KEY: string;
  DB: D1Database;
};

const StoreApiKeySchema = z.object({
  exchange: z.string().min(1).toUpperCase(), // BYBIT, IBKR, etc.
  api_key: z.string().min(1),
  api_secret: z.string().min(1),
  passphrase: z.string().optional(),
});

type User = {
  google_user_data?: {
    sub?: string;
    email?: string;
    name?: string;
  };
  firebase_user_id?: string;
  email?: string;
};

export const apiKeysRouter = new Hono<{ Bindings: Env; Variables: { user: User | undefined } }>();

// Firebase session auth middleware
const firebaseAuthMiddleware = async (c: unknown, next: () => Promise<void>) => {
  const context = c as {
    get: (key: string) => User | undefined;
    set: (key: string, value: User) => void;
    json: (data: { error: string }, status: number) => Response;
  };

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
        email: userData.email,
      });
      return next();
    } catch (error) {
      console.error('Error parsing Firebase session:', error);
    }
  }

  return context.json({ error: 'Unauthorized' }, 401);
};

// Apply auth to all routes
apiKeysRouter.use('*', firebaseAuthMiddleware);

/**
 * POST /api/keys/store
 * Store encrypted API keys for an exchange
 */
apiKeysRouter.post('/store', zValidator('json', StoreApiKeySchema), async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    const data = c.req.valid('json');
    const masterKey = c.env.ENCRYPTION_MASTER_KEY;

    if (!masterKey) {
      console.error('ENCRYPTION_MASTER_KEY not set in environment');
      return c.json({ error: 'Encryption service unavailable' }, 500);
    }

    // Encrypt API key and secret
    const encryptedKey = await encrypt(data.api_key, masterKey);
    const encryptedSecret = await encrypt(data.api_secret, masterKey);

    // Store in api_keys table (upsert)
    // Note: Passphrase support can be added later if needed
    const result = await c.env.DB.prepare(`
      INSERT INTO api_keys (
        user_id, exchange, encrypted_key, encrypted_secret, created_at, updated_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, exchange) DO UPDATE SET
        encrypted_key = excluded.encrypted_key,
        encrypted_secret = excluded.encrypted_secret,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      userId,
      data.exchange,
      encryptedKey,
      encryptedSecret
    ).run();

    if (!result.success) {
      console.error('Failed to store API keys:', result);
      return c.json({ error: 'Failed to store API keys' }, 500);
    }

    return c.json({ 
      success: true, 
      message: `API keys stored for ${data.exchange}`,
      exchange: data.exchange
    });
  } catch (error) {
    console.error('Error storing API keys:', error);
    return c.json({ 
      error: 'Failed to store API keys',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * GET /api/keys/:exchange
 * Get encrypted API keys for an exchange (for order execution only)
 * Returns encrypted keys - decryption happens in order execution route
 */
apiKeysRouter.get('/:exchange', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    const exchange = c.req.param('exchange').toUpperCase();

    // Get encrypted keys from database
    // Note: IV is embedded in encrypted data (Web Crypto API standard)
    const apiKeyRecord = await c.env.DB.prepare(`
      SELECT encrypted_key, encrypted_secret, created_at, updated_at
      FROM api_keys
      WHERE user_id = ? AND exchange = ?
    `).bind(userId, exchange).first<{
      encrypted_key: string;
      encrypted_secret: string;
      created_at: string;
      updated_at: string;
    }>();

    if (!apiKeyRecord) {
      return c.json({ error: 'API keys not found for this exchange' }, 404);
    }

    // Return encrypted keys (never return plaintext)
    return c.json({
      exchange,
      encrypted_key: apiKeyRecord.encrypted_key,
      encrypted_secret: apiKeyRecord.encrypted_secret,
      created_at: apiKeyRecord.created_at,
      updated_at: apiKeyRecord.updated_at
    });
  } catch (error) {
    console.error('Error retrieving API keys:', error);
    return c.json({ 
      error: 'Failed to retrieve API keys',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * DELETE /api/keys/:exchange
 * Delete API keys for an exchange
 */
apiKeysRouter.delete('/:exchange', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    const exchange = c.req.param('exchange').toUpperCase();

    const result = await c.env.DB.prepare(`
      DELETE FROM api_keys
      WHERE user_id = ? AND exchange = ?
    `).bind(userId, exchange).run();

    if (!result.success) {
      return c.json({ error: 'Failed to delete API keys' }, 500);
    }

    return c.json({ 
      success: true, 
      message: `API keys deleted for ${exchange}` 
    });
  } catch (error) {
    console.error('Error deleting API keys:', error);
    return c.json({ 
      error: 'Failed to delete API keys',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * Helper function to decrypt API keys for order execution
 * Keys are decrypted in RAM and should be cleared after use
 * 
 * @param encryptedKey - Encrypted API key from database
 * @param encryptedSecret - Encrypted API secret from database
 * @param masterKey - Master encryption key from environment
 * @returns Decrypted keys (only in RAM)
 */
export async function decryptApiKeysForExecution(
  encryptedKey: string,
  encryptedSecret: string,
  masterKey: string
): Promise<{ apiKey: string; apiSecret: string }> {
  const apiKey = await decrypt(encryptedKey, masterKey);
  const apiSecret = await decrypt(encryptedSecret, masterKey);
  
  // Keys are now in RAM - caller must ensure they are not logged or exposed
  return { apiKey, apiSecret };
}
