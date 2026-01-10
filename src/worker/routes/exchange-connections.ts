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

export const exchangeConnectionsRouter = new Hono<{ Bindings: Env; Variables: { user: UserVariable } }>();

// Firebase session auth middleware
const firebaseAuthMiddleware = async (c: unknown, next: () => Promise<void>) => {
    const context = c as {
        get: (key: string) => UserVariable | undefined;
        set: (key: string, value: UserVariable) => void;
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

// Apply auth
exchangeConnectionsRouter.use('*', firebaseAuthMiddleware);

// Get all connections
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
    const mappedConnections = connections.results.map((conn: any) => ({
        ...conn,
        api_key: conn.api_key_encrypted,
        api_secret: conn.api_secret_encrypted, // Should probably not send back or mask
        passphrase: conn.passphrase_encrypted,
        // exchange_name column doesn't exist, utilize exchange_id
        exchange_name: conn.exchange_id ? (conn.exchange_id.charAt(0).toUpperCase() + conn.exchange_id.slice(1)) : ''
    }));

    return c.json({ connections: mappedConnections });
});

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

// Test connection without storing credentials
exchangeConnectionsRouter.post('/test', zValidator('json', TestConnectionSchema), async (c) => {
    const data = c.req.valid('json');

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
            } catch (balanceError: any) {
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
    } catch (error: any) {
        console.error('Connection test error:', error);

        // Provide helpful error messages
        let errorMessage = 'Connection failed';
        if (error.message?.includes('Invalid API')) {
            errorMessage = 'Invalid API key or secret';
        } else if (error.message?.includes('IP')) {
            errorMessage = 'IP address not whitelisted';
        } else if (error.message?.includes('permission')) {
            errorMessage = 'API key lacks required permissions';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return c.json({
            success: false,
            error: errorMessage,
        }, 400);
    }
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
        user_id, exchange_id, api_key_encrypted, api_secret_encrypted, passphrase_encrypted, 
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
  `).bind(result.meta.last_row_id).first();

    const mappedConnection = {
        ...newConnection as any,
        api_key: (newConnection as any).api_key_encrypted,
        api_secret: (newConnection as any).api_secret_encrypted,
        passphrase: (newConnection as any).passphrase_encrypted,
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
        // Decrypt API keys
        const masterKey = c.env.ENCRYPTION_MASTER_KEY;
        if (!masterKey) {
            return c.json({ error: 'Encryption service unavailable' }, 500);
        }

        const apiKey = await decrypt(conn.api_key_encrypted as string, masterKey);
        const apiSecret = await decrypt(conn.api_secret_encrypted as string, masterKey);
        const passphrase = conn.passphrase_encrypted
            ? await decrypt(conn.passphrase_encrypted as string, masterKey)
            : undefined;

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
        const trades = await exchange.getTrades(undefined, undefined, undefined, 50);

        let importedCount = 0;
        let skippedCount = 0;

        for (const trade of trades) {
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

                await c.env.DB.prepare(`
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
                    trade.price,
                    trade.price, // Use trade price for both entry/exit (single fill)
                    exitDate,
                    exitDate,
                    pnl,
                    trade.fee
                ).run();
                importedCount++;
            } else {
                skippedCount++;
            }
        }

        const exchangeName = exchange.getExchangeName();
        return c.json({
            imported: importedCount,
            mapped: trades.length,
            skipped: skippedCount,
            errors: [],
            message: `Successfully synced ${importedCount} trades from ${exchangeName}.`
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
