/**
 * Lighter DEX API Routes
 *
 * Handles Lighter DEX integration endpoints for:
 * - Wallet connection and account linking
 * - Account info and balances
 * - Market data
 * - Order placement with risk validation
 * - Position management
 *
 * Lighter DEX: Zero-fee perpetual trading on Arbitrum
 * API: https://mainnet.zklighter.elliot.ai
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getCookie } from "hono/cookie";
import { D1Database } from "@cloudflare/workers-types";
import { encrypt, decrypt } from "../utils/encryption";
import { LighterExchange } from "../utils/exchanges/LighterExchange";

type Env = {
  ENCRYPTION_MASTER_KEY: string;
  DB: D1Database;
};

// ============================================================================
// Validation Schemas
// ============================================================================

const ConnectWalletSchema = z.object({
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().min(1),
  message: z.string().min(1),
});

const CreateAccountSchema = z.object({
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  api_key: z.string().min(1),
  api_secret: z.string().min(1),
  account_index: z.number().min(3).max(254),
});

const PlaceOrderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  stop_loss: z.number().positive().optional(),
  take_profit: z.number().positive().optional(),
  leverage: z.number().min(1).max(50).default(1),
  time_in_force: z.enum(['gtc', 'ioc', 'fok', 'post_only']).default('gtc'),
  reduce_only: z.boolean().default(false),
  client_order_id: z.string().optional(),
});

const CancelOrderSchema = z.object({
  order_id: z.string().min(1),
  symbol: z.string().optional(),
});

// ============================================================================
// Types
// ============================================================================

interface UserVariable {
  google_user_data?: {
    sub: string;
    email?: string;
    name?: string;
  };
  firebase_user_id?: string;
  email?: string;
}

interface LighterConnection {
  id?: number;
  user_id?: string;
  wallet_address?: string;
  api_key?: string;
  api_secret?: string;
  account_index?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Router Setup
// ============================================================================

export const lighterRouter = new Hono<{ Bindings: Env; Variables: { user: UserVariable } }>();

// Firebase session auth middleware
const firebaseAuthMiddleware = async (c: unknown, next: () => Promise<void>) => {
  const context = c as {
    req: { header: (name: string) => string | undefined };
    get: (key: string) => UserVariable | undefined;
    set: (key: string, value: UserVariable) => void;
    json: (data: { error: string }, status: number) => Response;
  };

  // Try Authorization header first (Firebase ID Token)
  const authHeader = context.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const base64Url = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
        const base64 = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
        const payload = JSON.parse(atob(base64));

        const userId = payload.sub || payload.user_id;

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
    } catch (error) {
      console.error('[Lighter Auth] Error parsing Authorization token:', error);
    }
  }

  // Fallback to session cookie
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
      console.error('[Lighter Auth] Error parsing Firebase session:', error);
    }
  }

  return context.json({ error: 'Unauthorized' }, 401);
};

// ============================================================================
// Public Routes (no auth required)
// ============================================================================

/**
 * GET /api/lighter/markets
 * Get all available trading pairs on Lighter DEX
 */
lighterRouter.get('/markets', async (c) => {
  try {
    const response = await fetch('https://mainnet.zklighter.elliot.ai/api/v1/markets', {
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return c.json(data);
  } catch (error) {
    console.error('[Lighter] Error fetching markets:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch markets'
    }, 500);
  }
});

/**
 * GET /api/lighter/orderbook/:symbol
 * Get orderbook for a specific trading pair (REST fallback)
 */
lighterRouter.get('/orderbook/:symbol', async (c) => {
  const symbol = c.req.param('symbol');

  try {
    const response = await fetch(
      `https://mainnet.zklighter.elliot.ai/api/v1/orderbook/${symbol}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch orderbook: ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return c.json(data);
  } catch (error) {
    console.error('[Lighter] Error fetching orderbook:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orderbook'
    }, 500);
  }
});

/**
 * GET /api/lighter/ticker/:symbol
 * Get ticker info for a specific trading pair
 */
lighterRouter.get('/ticker/:symbol', async (c) => {
  const symbol = c.req.param('symbol');

  try {
    const response = await fetch(
      `https://mainnet.zklighter.elliot.ai/api/v1/ticker/${symbol}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ticker: ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return c.json(data);
  } catch (error) {
    console.error('[Lighter] Error fetching ticker:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ticker'
    }, 500);
  }
});

// ============================================================================
// Protected Routes (auth required)
// ============================================================================

lighterRouter.use('/*', firebaseAuthMiddleware);

/**
 * POST /api/lighter/connect-wallet
 * Link a wallet address to Lighter account
 */
lighterRouter.post('/connect-wallet', zValidator('json', ConnectWalletSchema), async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const data = c.req.valid('json');

  // TODO: In production, verify the signature against the message
  // const isValid = await verifyEthereumSignature(data.wallet_address, data.signature, data.message);
  // if (!isValid) {
  //   return c.json({ error: 'Invalid signature' }, 400);
  // }

  // Check if wallet is already connected
  const existing = await c.env.DB.prepare(`
    SELECT id FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter' AND lighter_wallet_address = ?
  `).bind(userId, data.wallet_address.toLowerCase()).first();

  if (existing) {
    return c.json({
      success: true,
      message: 'Wallet already connected',
      wallet_address: data.wallet_address
    });
  }

  // Store the wallet connection (without API keys yet)
  const result = await c.env.DB.prepare(`
    INSERT INTO exchange_connections (
      user_id, exchange_id, lighter_wallet_address,
      api_key, api_secret, created_at, updated_at
    ) VALUES (?, 'lighter', ?, '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(userId, data.wallet_address.toLowerCase()).run();

  if (!result.success) {
    return c.json({ error: 'Failed to store wallet connection' }, 500);
  }

  return c.json({
    success: true,
    message: 'Wallet connected successfully',
    wallet_address: data.wallet_address,
    connection_id: result.meta.last_row_id
  });
});

/**
 * POST /api/lighter/create-account
 * Create or link a Lighter account with API credentials
 */
lighterRouter.post('/create-account', zValidator('json', CreateAccountSchema), async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const data = c.req.valid('json');
  const masterKey = c.env.ENCRYPTION_MASTER_KEY;

  if (!masterKey) {
    return c.json({ error: 'Encryption service unavailable' }, 500);
  }

  // Test the connection first
  try {
    const exchange = new LighterExchange({
      apiKey: data.api_key,
      apiSecret: data.api_secret,
      accountIndex: data.account_index,
      walletAddress: data.wallet_address
    });

    const isConnected = await exchange.testConnection();
    if (!isConnected) {
      return c.json({ error: 'Failed to connect to Lighter account' }, 400);
    }
  } catch (error) {
    console.error('[Lighter] Connection test failed:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Invalid API credentials'
    }, 400);
  }

  // Encrypt credentials
  const encryptedKey = await encrypt(data.api_key, masterKey);
  const encryptedSecret = await encrypt(data.api_secret, masterKey);

  // Check if connection exists
  const existing = await c.env.DB.prepare(`
    SELECT id FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first();

  let result;
  if (existing) {
    // Update existing connection
    result = await c.env.DB.prepare(`
      UPDATE exchange_connections
      SET api_key = ?, api_secret = ?,
          lighter_account_index = ?, lighter_wallet_address = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND exchange_id = 'lighter'
    `).bind(
      encryptedKey,
      encryptedSecret,
      data.account_index,
      data.wallet_address.toLowerCase(),
      userId
    ).run();
  } else {
    // Create new connection
    result = await c.env.DB.prepare(`
      INSERT INTO exchange_connections (
        user_id, exchange_id, api_key, api_secret,
        lighter_account_index, lighter_wallet_address,
        created_at, updated_at
      ) VALUES (?, 'lighter', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      userId,
      encryptedKey,
      encryptedSecret,
      data.account_index,
      data.wallet_address.toLowerCase()
    ).run();
  }

  if (!result.success) {
    return c.json({ error: 'Failed to store account credentials' }, 500);
  }

  return c.json({
    success: true,
    message: 'Lighter account connected successfully',
    account_index: data.account_index,
    wallet_address: data.wallet_address
  });
});

/**
 * GET /api/lighter/account
 * Get Lighter account info and balances
 */
lighterRouter.get('/account', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const connection = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first() as LighterConnection | null;

  if (!connection || !connection.api_key || !connection.api_secret) {
    return c.json({
      success: false,
      error: 'Lighter account not connected',
      needs_setup: true
    }, 404);
  }

  const masterKey = c.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return c.json({ error: 'Encryption service unavailable' }, 500);
  }

  try {
    const apiKey = await decrypt(connection.api_key, masterKey);
    const apiSecret = await decrypt(connection.api_secret, masterKey);

    const exchange = new LighterExchange({
      apiKey,
      apiSecret,
      accountIndex: connection.account_index,
      walletAddress: connection.wallet_address
    });

    const balance = await exchange.getBalance();

    return c.json({
      success: true,
      account: {
        account_index: connection.account_index,
        wallet_address: connection.wallet_address,
        total_value: balance.totalEquityUsd,
        available_margin: balance.availableMarginUsd,
        used_margin: balance.usedMarginUsd,
        balances: balance.balances
      }
    });
  } catch (error) {
    console.error('[Lighter] Error fetching account:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account info'
    }, 500);
  }
});

/**
 * GET /api/lighter/positions
 * Get all open positions
 */
lighterRouter.get('/positions', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const connection = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first() as LighterConnection | null;

  if (!connection || !connection.api_key || !connection.api_secret) {
    return c.json({ success: false, error: 'Lighter account not connected' }, 404);
  }

  const masterKey = c.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return c.json({ error: 'Encryption service unavailable' }, 500);
  }

  try {
    const apiKey = await decrypt(connection.api_key, masterKey);
    const apiSecret = await decrypt(connection.api_secret, masterKey);

    const exchange = new LighterExchange({
      apiKey,
      apiSecret,
      accountIndex: connection.account_index,
      walletAddress: connection.wallet_address
    });

    const positions = await exchange.getPositions();

    return c.json({
      success: true,
      positions
    });
  } catch (error) {
    console.error('[Lighter] Error fetching positions:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch positions'
    }, 500);
  }
});

/**
 * GET /api/lighter/orders
 * Get all open orders
 */
lighterRouter.get('/orders', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const symbol = c.req.query('symbol');

  const connection = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first() as LighterConnection | null;

  if (!connection || !connection.api_key || !connection.api_secret) {
    return c.json({ success: false, error: 'Lighter account not connected' }, 404);
  }

  const masterKey = c.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return c.json({ error: 'Encryption service unavailable' }, 500);
  }

  try {
    const apiKey = await decrypt(connection.api_key, masterKey);
    const apiSecret = await decrypt(connection.api_secret, masterKey);

    const exchange = new LighterExchange({
      apiKey,
      apiSecret,
      accountIndex: connection.account_index,
      walletAddress: connection.wallet_address
    });

    const orders = await exchange.getOpenOrders(symbol);

    return c.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('[Lighter] Error fetching orders:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orders'
    }, 500);
  }
});

/**
 * POST /api/lighter/place-order
 * Place an order with risk validation
 */
lighterRouter.post('/place-order', zValidator('json', PlaceOrderSchema), async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const data = c.req.valid('json');

  const connection = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first() as LighterConnection | null;

  if (!connection || !connection.api_key || !connection.api_secret) {
    return c.json({ success: false, error: 'Lighter account not connected' }, 404);
  }

  const masterKey = c.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return c.json({ error: 'Encryption service unavailable' }, 500);
  }

  try {
    const apiKey = await decrypt(connection.api_key, masterKey);
    const apiSecret = await decrypt(connection.api_secret, masterKey);

    const exchange = new LighterExchange({
      apiKey,
      apiSecret,
      accountIndex: connection.account_index,
      walletAddress: connection.wallet_address
    });

    // Validate risk if stop loss is provided
    if (data.stop_loss && data.price) {
      // Get user's risk settings
      const userSettings = await c.env.DB.prepare(`
        SELECT starting_capital, max_daily_loss FROM users
        WHERE google_user_id = ?
      `).bind(userId).first() as { starting_capital?: number; max_daily_loss?: number } | null;

      const startingCapital = userSettings?.starting_capital || 10000;
      const entryPrice = data.price || 0;
      const riskAmount = Math.abs(entryPrice - data.stop_loss) * data.quantity;

      const riskValidation = await exchange.validateRisk(
        riskAmount,
        entryPrice,
        data.stop_loss,
        data.leverage,
        'cross',
        data.symbol,
        0, // currentDailyLoss - would need to calculate from DB
        0, // totalLoss - would need to calculate from DB
        startingCapital
      );

      if (!riskValidation.valid) {
        return c.json({
          success: false,
          error: riskValidation.reason,
          risk_validation: riskValidation
        }, 400);
      }

      // Include warnings in response if any
      if (riskValidation.warnings && riskValidation.warnings.length > 0) {
        console.log('[Lighter] Risk warnings:', riskValidation.warnings);
      }
    }

    // Place the order
    const order = await exchange.createOrder({
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      quantity: data.quantity,
      price: data.price,
      stopPrice: data.stop_price,
      stopLoss: data.stop_loss,
      takeProfit: data.take_profit,
      leverage: data.leverage,
      timeInForce: data.time_in_force,
      reduceOnly: data.reduce_only,
      clientOrderId: data.client_order_id
    });

    return c.json({
      success: true,
      order,
      message: 'Order placed successfully'
    });
  } catch (error) {
    console.error('[Lighter] Error placing order:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to place order'
    }, 500);
  }
});

/**
 * POST /api/lighter/cancel-order
 * Cancel a specific order
 */
lighterRouter.post('/cancel-order', zValidator('json', CancelOrderSchema), async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const data = c.req.valid('json');

  const connection = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first() as LighterConnection | null;

  if (!connection || !connection.api_key || !connection.api_secret) {
    return c.json({ success: false, error: 'Lighter account not connected' }, 404);
  }

  const masterKey = c.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return c.json({ error: 'Encryption service unavailable' }, 500);
  }

  try {
    const apiKey = await decrypt(connection.api_key, masterKey);
    const apiSecret = await decrypt(connection.api_secret, masterKey);

    const exchange = new LighterExchange({
      apiKey,
      apiSecret,
      accountIndex: connection.account_index,
      walletAddress: connection.wallet_address
    });

    await exchange.cancelOrder(data.order_id, data.symbol);

    return c.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('[Lighter] Error cancelling order:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order'
    }, 500);
  }
});

/**
 * POST /api/lighter/cancel-all
 * Cancel all open orders
 */
lighterRouter.post('/cancel-all', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json().catch(() => ({})) as { symbol?: string };
  const symbol = body.symbol;

  const connection = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first() as LighterConnection | null;

  if (!connection || !connection.api_key || !connection.api_secret) {
    return c.json({ success: false, error: 'Lighter account not connected' }, 404);
  }

  const masterKey = c.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return c.json({ error: 'Encryption service unavailable' }, 500);
  }

  try {
    const apiKey = await decrypt(connection.api_key, masterKey);
    const apiSecret = await decrypt(connection.api_secret, masterKey);

    const exchange = new LighterExchange({
      apiKey,
      apiSecret,
      accountIndex: connection.account_index,
      walletAddress: connection.wallet_address
    });

    await exchange.cancelAllOrders(symbol);

    return c.json({
      success: true,
      message: symbol ? `All orders cancelled for ${symbol}` : 'All orders cancelled'
    });
  } catch (error) {
    console.error('[Lighter] Error cancelling all orders:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel orders'
    }, 500);
  }
});

/**
 * GET /api/lighter/trades
 * Get trade history
 */
lighterRouter.get('/trades', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const symbol = c.req.query('symbol');
  const limit = parseInt(c.req.query('limit') || '100');

  const connection = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first() as LighterConnection | null;

  if (!connection || !connection.api_key || !connection.api_secret) {
    return c.json({ success: false, error: 'Lighter account not connected' }, 404);
  }

  const masterKey = c.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return c.json({ error: 'Encryption service unavailable' }, 500);
  }

  try {
    const apiKey = await decrypt(connection.api_key, masterKey);
    const apiSecret = await decrypt(connection.api_secret, masterKey);

    const exchange = new LighterExchange({
      apiKey,
      apiSecret,
      accountIndex: connection.account_index,
      walletAddress: connection.wallet_address
    });

    const trades = await exchange.getTrades(symbol, undefined, undefined, limit);

    return c.json({
      success: true,
      trades
    });
  } catch (error) {
    console.error('[Lighter] Error fetching trades:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trades'
    }, 500);
  }
});

/**
 * GET /api/lighter/connection-status
 * Check if user has Lighter connected
 */
lighterRouter.get('/connection-status', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const connection = await c.env.DB.prepare(`
    SELECT id, lighter_wallet_address, lighter_account_index, created_at
    FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).first();

  if (!connection) {
    return c.json({
      connected: false,
      needs_setup: true
    });
  }

  return c.json({
    connected: true,
    wallet_address: connection.lighter_wallet_address,
    account_index: connection.lighter_account_index,
    connected_at: connection.created_at
  });
});

/**
 * DELETE /api/lighter/disconnect
 * Disconnect Lighter account
 */
lighterRouter.delete('/disconnect', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const result = await c.env.DB.prepare(`
    DELETE FROM exchange_connections
    WHERE user_id = ? AND exchange_id = 'lighter'
  `).bind(userId).run();

  if (!result.success) {
    return c.json({ error: 'Failed to disconnect' }, 500);
  }

  return c.json({
    success: true,
    message: 'Lighter account disconnected'
  });
});
