import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getCookie } from "hono/cookie";
import { D1Database } from "@cloudflare/workers-types";
import { encrypt, decrypt } from "../utils/encryption";
import { ExchangeFactory, type ExchangeId } from "../utils/exchanges";

type Env = {
    ENCRYPTION_MASTER_KEY: string;
    DB: D1Database;
};

const CreateConnectionSchema = z.object({
    exchange_id: z.string().min(1),
    api_key: z.string().min(1),
    api_secret: z.string().min(1),
    passphrase: z.string().optional(),
    auto_sync_enabled: z.boolean().optional(),
    sync_interval_hours: z.number().min(1).optional(),
});

const TestConnectionSchema = z.object({
    exchange_id: z.string().min(1),
    api_key: z.string().min(1),
    api_secret: z.string().min(1),
    passphrase: z.string().optional(),
    is_testnet: z.boolean().optional(),
});

interface UserVariable {
  google_user_data?: {
    sub: string;
    email?: string;
    name?: string;
  };
  firebase_user_id?: string;
  email?: string;
}

interface ExchangeConnection {
  id?: number;
  user_id?: string;
  exchange_id?: string;
  api_key?: string;
  api_secret?: string;
  passphrase?: string | null;
  auto_sync_enabled?: number;
  sync_interval_hours?: number;
  created_at?: string;
  updated_at?: string;
  last_sync_at?: string | null;
}

export const exchangeConnectionsRouter = new Hono<{ Bindings: Env; Variables: { user: UserVariable } }>();

// Firebase session auth middleware - supports both Authorization header and session cookie
const firebaseAuthMiddleware = async (c: unknown, next: () => Promise<void>) => {
    const context = c as {
        req: { header: (name: string) => string | undefined };
        get: (key: string) => UserVariable | undefined;
        set: (key: string, value: UserVariable) => void;
        json: (data: { error: string }, status: number) => Response;
    };

    console.log('[Exchange Auth] Checking authentication...');

    // Try Authorization header first (Firebase ID Token)
    const authHeader = context.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('[Exchange Auth] Found Authorization header');

        try {
            // Decode Firebase ID token (simplified - in production, verify signature)
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const base64Url = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
                const base64 = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
                const payload = JSON.parse(atob(base64));

                const userId = payload.sub || payload.user_id;
                console.log('[Exchange Auth] User authenticated via token:', userId);

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
            console.error('[Exchange Auth] Error parsing Authorization token:', error);
        }
    }

    // Fallback to session cookie
    const firebaseSession = getCookie(context as Parameters<typeof getCookie>[0], 'firebase_session');
    console.log('[Exchange Auth] Firebase session cookie:', firebaseSession ? 'Found' : 'Missing');

    if (firebaseSession) {
        try {
            const userData = JSON.parse(firebaseSession) as { google_user_id?: string; sub?: string; email?: string; name?: string };
            console.log('[Exchange Auth] User authenticated via cookie:', userData.google_user_id || userData.sub);
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
            console.error('[Exchange Auth] Error parsing Firebase session:', error);
        }
    }

    console.log('[Exchange Auth] Returning Unauthorized - no valid auth found');
    return context.json({ error: 'Unauthorized' }, 401);
};

// Public routes (no auth required)
// Get supported exchanges
exchangeConnectionsRouter.get('/supported', async (c) => {
    // Get full list of supported exchanges from factory
    const supportedExchanges = ExchangeFactory.getSupportedExchanges();

    // Filter to only show implemented exchanges for now
    const implementedExchanges = supportedExchanges.filter(ex =>
        ['binance', 'bybit', 'coinbase', 'kraken', 'okx'].includes(ex.id)
    );

    return c.json({ exchanges: implementedExchanges });
});

// Test connection without storing credentials (no auth required)
exchangeConnectionsRouter.post('/test', zValidator('json', TestConnectionSchema), async (c) => {
    console.log('[Exchange Test] Received test request');
    const data = c.req.valid('json');
    console.log('[Exchange Test] Exchange:', data.exchange_id);

    try {
        // Validate exchange is supported
        const supportedExchanges = ExchangeFactory.getSupportedExchanges();
        const exchangeInfo = supportedExchanges.find(ex => ex.id === data.exchange_id);

        if (!exchangeInfo) {
            return c.json({
                success: false,
                error: `Exchange "${data.exchange_id}" is not supported`,
            }, 400);
        }

        // Create exchange instance with provided credentials (not stored)
        const exchange = ExchangeFactory.create({
            exchangeId: data.exchange_id as ExchangeId,
            credentials: {
                apiKey: data.api_key,
                apiSecret: data.api_secret,
                passphrase: data.passphrase,
            },
            testnet: data.is_testnet || false,
        });

        // Test the connection
        const isConnected = await exchange.testConnection();

        if (isConnected) {
            // Try to get balance to verify full access
            try {
                const balance = await exchange.getBalance();
                return c.json({
                    success: true,
                    message: 'Connection successful',
                    balance: {
                        totalEquity: balance.totalEquityUsd,
                        availableBalance: balance.availableMarginUsd,
                        accountType: balance.accountType,
                    },
                });
            } catch {
                // Connection works but balance failed - might be read-only key
                return c.json({
                    success: true,
                    message: 'Connection successful (limited permissions)',
                    warning: 'Could not fetch balance - API key may have limited permissions',
                });
            }
        } else {
            return c.json({
                success: false,
                error: 'Connection test failed - please verify your API credentials',
            }, 400);
        }
    } catch (error: unknown) {
        console.error('[Exchange Test] Connection test error:', error);

        // Provide helpful error messages
        let errorMessage = 'Connection failed';
        if (error instanceof Error) {
            if (error.message?.includes('Invalid API')) {
                errorMessage = 'Invalid API key or secret';
            } else if (error.message?.includes('IP')) {
                errorMessage = 'IP address not whitelisted';
            } else if (error.message?.includes('permission')) {
                errorMessage = 'API key lacks required permissions';
            } else if (error.message?.includes('Empty response')) {
                errorMessage = 'Empty response from exchange API';
            } else if (error.message?.includes('JSON')) {
                errorMessage = 'Invalid response from exchange API';
            } else {
                errorMessage = error.message || 'Unknown error occurred';
            }
        }

        console.error('[Exchange Test] Returning error response:', errorMessage);
        return c.json({
            success: false,
            error: errorMessage,
        }, 400);
    }
});

// Apply auth middleware to protected routes
exchangeConnectionsRouter.use('*', firebaseAuthMiddleware);

// Get all connections (protected)
exchangeConnectionsRouter.get('/', async (c) => {
    const user = c.get('user');
    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const connections = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections WHERE user_id = ?
  `).bind(userId).all();

    // Map database columns to frontend interface
    const mappedConnections = (connections.results as ExchangeConnection[]).map((conn) => ({
        ...conn,
        // API keys are already encrypted in the database, return as-is
        // Frontend will only use these for display purposes (masked)
        // exchange_name column doesn't exist, utilize exchange_id
        exchange_name: conn.exchange_id ? (conn.exchange_id.charAt(0).toUpperCase() + conn.exchange_id.slice(1)) : ''
    }));

    return c.json({ connections: mappedConnections });
});

// Create connection
exchangeConnectionsRouter.post('/', zValidator('json', CreateConnectionSchema), async (c) => {
    const user = c.get('user');
    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const data = c.req.valid('json');

    // Check if connection already exists for this exchange
    const existing = await c.env.DB.prepare(`
    SELECT id FROM exchange_connections WHERE user_id = ? AND exchange_id = ?
  `).bind(userId, data.exchange_id).first();

    if (existing) {
        // Update existing? Or Error? Usually one key per exchange is typical or multiple.
        // For now, allow multiple or just insert. The hook seems to allow creating new ones.
        // Let's just insert.
    }

    // Encrypt API keys before storing
    const masterKey = c.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      return c.json({ error: 'Encryption service unavailable' }, 500);
    }

    const encryptedKey = await encrypt(data.api_key, masterKey);
    const encryptedSecret = await encrypt(data.api_secret, masterKey);
    const encryptedPassphrase = data.passphrase 
      ? await encrypt(data.passphrase, masterKey)
      : null;

    // Store encrypted keys in exchange_connections table
    const result = await c.env.DB.prepare(`
      INSERT INTO exchange_connections (
        user_id, exchange_id, api_key, api_secret, passphrase,
        auto_sync_enabled, sync_interval_hours, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
        userId,
        data.exchange_id,
        encryptedKey,
        encryptedSecret,
        encryptedPassphrase,
        data.auto_sync_enabled ? 1 : 0,
        data.sync_interval_hours || 24
    ).run();

    if (!result.success) {
        return c.json({ error: 'Failed to create connection' }, 500);
    }

    const newConnection = await c.env.DB.prepare(`
    SELECT * FROM exchange_connections WHERE id = ?
  `).bind(result.meta.last_row_id).first() as ExchangeConnection | null;

    if (!newConnection) {
        return c.json({ error: 'Failed to retrieve created connection' }, 500);
    }

    const mappedConnection = {
        ...newConnection,
        // API keys are already encrypted in the database, return as-is
        exchange_name: data.exchange_id.charAt(0).toUpperCase() + data.exchange_id.slice(1)
    };

    return c.json({ connection: mappedConnection });
});

// Delete connection
exchangeConnectionsRouter.delete('/:id', async (c) => {
    const user = c.get('user');
    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
    DELETE FROM exchange_connections WHERE id = ? AND user_id = ?
  `).bind(id, userId).run();

    if (!result.success) {
        return c.json({ error: 'Failed to delete connection' }, 500);
    }

    return c.json({ success: true });
});

// Sync connection - Uses unified ExchangeFactory for all supported exchanges
exchangeConnectionsRouter.post('/:id/sync', async (c) => {
    const user = c.get('user');
    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const id = c.req.param('id');

    const connection = await c.env.DB.prepare(`
        SELECT * FROM exchange_connections WHERE id = ? AND user_id = ?
    `).bind(id, userId).first();

    if (!connection) {
        return c.json({ error: 'Connection not found' }, 404);
    }

    // Update last_sync_at
    await c.env.DB.prepare(`
        UPDATE exchange_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(id).run();

    const conn = connection as Record<string, unknown>;
    const exchangeId = conn.exchange_id as string;

    // List of exchanges that support sync via unified interface
    const supportedExchanges = ['bybit', 'binance', 'coinbase', 'kraken', 'okx'];

    if (!supportedExchanges.includes(exchangeId)) {
        return c.json({
            imported: 0,
            mapped: 0,
            errors: [`Exchange ${exchangeId} not yet supported for sync`],
            message: 'Exchange not supported'
        });
    }

    try {
        console.log(`[Exchange Sync] Starting sync for ${exchangeId}, connection ID: ${id}`);

        // Decrypt API keys
        const masterKey = c.env.ENCRYPTION_MASTER_KEY;
        if (!masterKey) {
            console.error('[Exchange Sync] No encryption master key found');
            return c.json({ error: 'Encryption service unavailable' }, 500);
        }

        console.log('[Exchange Sync] Decrypting API keys...');
        const apiKey = await decrypt(conn.api_key as string, masterKey);
        const apiSecret = await decrypt(conn.api_secret as string, masterKey);
        const passphrase = conn.passphrase
            ? await decrypt(conn.passphrase as string, masterKey)
            : undefined;

        console.log('[Exchange Sync] Creating exchange instance...');
        // Create exchange instance via factory
        const exchange = ExchangeFactory.create({
            exchangeId: exchangeId as ExchangeId,
            credentials: {
                apiKey,
                apiSecret,
                passphrase,
            },
            testnet: false,
        });

        // Fetch trades using unified interface
        console.log(`[Exchange Sync] Fetching trades from ${exchangeId}...`);
        const trades = await exchange.getTrades(undefined, undefined, undefined, 50);
        console.log(`[Exchange Sync] Received ${trades.length} trades from ${exchangeId}`);

        let importedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const trade of trades) {
            // Validate trade data - skip if quantity is 0, null, or invalid
            if (!trade.quantity || trade.quantity === 0 || isNaN(trade.quantity)) {
                console.log(`[Exchange Sync] Skipping trade with invalid quantity:`, trade);
                errorCount++;
                continue;
            }

            // Validate price
            if (!trade.price || trade.price === 0 || isNaN(trade.price)) {
                console.log(`[Exchange Sync] Skipping trade with invalid price:`, trade);
                errorCount++;
                continue;
            }

            // Check for duplicate
            const exitDate = trade.timestamp.toISOString();
            const pnl = trade.realizedPnl || 0;

            const existing = await c.env.DB.prepare(`
                SELECT id FROM trades
                WHERE user_id = ?
                AND symbol = ?
                AND ABS(COALESCE(pnl, 0) - ?) < 0.0001
                AND exit_date = ?
            `).bind(userId, trade.symbol, pnl, exitDate).first();

            if (!existing) {
                // Determine direction from trade side
                const direction = trade.side === 'buy' ? 'long' : 'short';

                // For Bybit closed positions, calculate exit price from entry + P&L
                // If realizedPnl exists and quantity > 0, we can calculate the actual exit price
                let exitPrice = trade.price; // Default: same as entry (for single fills)

                if (pnl !== 0 && trade.quantity > 0) {
                    // For long: exitPrice = entryPrice + (pnl / quantity)
                    // For short: exitPrice = entryPrice - (pnl / quantity)
                    const pnlPerUnit = pnl / trade.quantity;
                    if (direction === 'long') {
                        exitPrice = trade.price + pnlPerUnit;
                    } else {
                        exitPrice = trade.price - pnlPerUnit;
                    }
                }

                console.log(`[Exchange Sync] Inserting trade: ${trade.symbol} ${direction} qty=${trade.quantity} entry=${trade.price} exit=${exitPrice} pnl=${pnl}`);

                try {
                    const insertResult = await c.env.DB.prepare(`
                        INSERT INTO trades (
                            user_id, symbol, asset_type, direction, quantity,
                            entry_price, exit_price, entry_date, exit_date,
                            pnl, commission, is_closed, created_at, updated_at
                        ) VALUES (?, ?, 'crypto', ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `).bind(
                        userId,
                        trade.symbol,
                        direction,
                        trade.quantity,
                        trade.price,      // Entry price
                        exitPrice,        // Calculated exit price from P&L
                        exitDate,
                        exitDate,
                        pnl,
                        trade.fee
                    ).run();

                    if (insertResult.success) {
                        importedCount++;
                        console.log(`[Exchange Sync] ✓ Trade inserted successfully`);
                    } else {
                        console.error(`[Exchange Sync] ✗ Trade insert failed:`, insertResult);
                        errorCount++;
                    }
                } catch (insertError) {
                    console.error(`[Exchange Sync] ✗ Trade insert error:`, insertError);
                    errorCount++;
                }
            } else {
                skippedCount++;
            }
        }

        const exchangeName = exchange.getExchangeName();

        console.log(`[Exchange Sync] Final stats: imported=${importedCount}, skipped=${skippedCount}, errors=${errorCount}, total=${trades.length}`);

        const messages = [`Successfully synced ${importedCount} trades from ${exchangeName}.`];
        if (errorCount > 0) {
            messages.push(`${errorCount} trades skipped due to invalid data (quantity=0 or null).`);
        }
        if (skippedCount > 0) {
            messages.push(`${skippedCount} trades already existed (duplicates).`);
        }

        return c.json({
            imported: importedCount,
            mapped: trades.length,
            skipped: skippedCount,
            errors: errorCount > 0 ? [`${errorCount} trades had invalid data`] : [],
            message: messages.join(' ')
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error during sync';
        console.error(`${exchangeId} Sync Error:`, error);
        return c.json({
            imported: 0,
            mapped: 0,
            errors: [message]
        }, 500);
    }
});
