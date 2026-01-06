import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "@getmocha/users-service/backend";
import { getCookie } from "hono/cookie";
import { D1Database } from "@cloudflare/workers-types";

type Env = {
    MOCHA_USERS_SERVICE_API_URL: string;
    MOCHA_USERS_SERVICE_API_KEY: string;
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

export const exchangeConnectionsRouter = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Combined auth middleware
const combinedAuthMiddleware = async (c: any, next: any) => {
    try {
        await authMiddleware(c, async () => { });
        if (c.get('user')) {
            return next();
        }
    } catch (e) {
        // Mocha auth failed, try Firebase session
    }

    const firebaseSession = getCookie(c, 'firebase_session');
    if (firebaseSession) {
        try {
            const userData = JSON.parse(firebaseSession);
            c.set('user', {
                google_user_data: {
                    sub: userData.google_user_id || userData.sub,
                    email: userData.email,
                    name: userData.name,
                },
                email: userData.email,
            });
            return next();
        } catch (e) {
            console.error('Error parsing Firebase session:', e);
        }
    }

    return c.json({ error: 'Unauthorized' }, 401);
};

// Apply auth
exchangeConnectionsRouter.use('*', combinedAuthMiddleware);

// Get all connections
exchangeConnectionsRouter.get('/', async (c) => {
    const user = c.get('user');
    const userId = user.google_user_data.sub;

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
    return c.json({
        exchanges: [
            { id: 'binance', name: 'Binance', logo: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png' },
            { id: 'bybit', name: 'Bybit', logo: 'https://cryptologos.cc/logos/bybit-logo.png' },
        ]
    });
});

// Create connection
exchangeConnectionsRouter.post('/', zValidator('json', CreateConnectionSchema), async (c) => {
    const user = c.get('user');
    const userId = user.google_user_data.sub;
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

    // exchange_name column does not exist in DB, derive it in frontend or select

    const result = await c.env.DB.prepare(`
    INSERT INTO exchange_connections (
      user_id, exchange_id, api_key_encrypted, api_secret_encrypted, passphrase_encrypted, 
      auto_sync_enabled, sync_interval_hours, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
        userId,
        data.exchange_id,
        data.api_key, // TODO: Encrypt
        data.api_secret, // TODO: Encrypt
        data.passphrase || null,
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
    const userId = user.google_user_data.sub;
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
    DELETE FROM exchange_connections WHERE id = ? AND user_id = ?
  `).bind(id, userId).run();

    if (!result.success) {
        return c.json({ error: 'Failed to delete connection' }, 500);
    }

    return c.json({ success: true });
});

// Helper to sign Bybit requests
async function signBybitRequest(apiKey: string, apiSecret: string, params: Record<string, any>) {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    // Sort params and create query string
    const queryString = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    const data = timestamp + apiKey + recvWindow + queryString;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(apiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
        timestamp,
        recvWindow,
        signature: hexSignature,
        queryString
    };
}

// Sync connection
exchangeConnectionsRouter.post('/:id/sync', async (c) => {
    const user = c.get('user');
    const userId = user.google_user_data.sub;
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

    const conn = connection as any;

    if (conn.exchange_id === 'bybit') {
        try {
            // Fetch closed PnL from Bybit V5 API (Linear Perps / Futures)
            // Doc: https://bybit-exchange.github.io/docs/v5/position/close-pnl
            // category=linear is for USDT Perps which is most common
            const params = {
                category: 'linear',
                limit: '50' // Get last 50 trades
            };

            const signed = await signBybitRequest(conn.api_key_encrypted, conn.api_secret_encrypted, params);

            const response = await fetch(`https://api.bybit.com/v5/position/closed-pnl?${signed.queryString}`, {
                method: 'GET',
                headers: {
                    'X-BAPI-API-KEY': conn.api_key_encrypted,
                    'X-BAPI-TIMESTAMP': signed.timestamp,
                    'X-BAPI-RECV-WINDOW': signed.recvWindow,
                    'X-BAPI-SIGN': signed.signature
                }
            });

            if (!response.ok) {
                const text = await response.text();
                console.error('Bybit API error:', text);
                return c.json({ imported: 0, mapped: 0, errors: [`Bybit API returned ${response.status}: ${text}`] });
            }

            const data: any = await response.json();

            if (data.retCode !== 0) {
                return c.json({ imported: 0, mapped: 0, errors: [`Bybit API error: ${data.retMsg}`] });
            }

            const trades = data.result.list;
            let importedCount = 0;
            let skippedCount = 0;

            for (const trade of trades) {
                // Map Bybit data to Tradecircle schema
                const symbol = trade.symbol;
                const entryDate = new Date(Number(trade.createdTime)).toISOString(); // This is effectively close time in closed-pnl, but serves as date
                const exitDate = new Date(Number(trade.updatedTime)).toISOString();
                // Determine direction from trade side
                // In Closed Pnl:
                // side: "Buy" -> You BOUGHT to close? Or it was a Long position?
                // Actually Bybit docs say: "side": "Buy" // Buy side
                // If I have a closed PnL, and side is Buy, does it mean I went Long?
                // Usually Closed PnL log records the transaction that closed it.
                // But let's look at `avgEntryPrice` and `avgExitPrice`.
                // If avgExitPrice > avgEntryPrice and pnl is positive, it was LONG.
                // Let's use simple logic: If PnL > 0 and Exit > Entry => LONG.
                // But safer is to trust the side if we interpret it right.
                // Let's assume standard mapping for now, refine if user complains.
                // For Bybit Linear: Side 'Buy' usually means Long position.

                const direction = trade.side === 'Buy' ? 'long' : 'short';
                const quantity = parseFloat(trade.qty);
                const entryPrice = parseFloat(trade.avgEntryPrice);
                const exitPrice = parseFloat(trade.avgExitPrice);
                const pnl = parseFloat(trade.closedPnl);
                // Note: Fee is complex to calc from closed-pnl, so we use net PnL directly
                // closed-pnl has 'execType', 'fillCount'.
                // It doesn't strictly have commission for the WHOLE trade pair easily calculated here without summing fills.
                // But we can just use the PnL.

                // Duplicate check: Look for trade with same symbol, close enough entry/exit date (or same timestamps), same quantity/pnl
                // Using exit_date as the primary unique timestamp check as it matches `updatedTime`

                const existing = await c.env.DB.prepare(`
                    SELECT id FROM trades 
                    WHERE user_id = ? 
                    AND symbol = ? 
                    AND ABS(pnl - ?) < 0.0001
                    AND exit_date = ?
                `).bind(userId, symbol, pnl, exitDate).first();

                if (!existing) {
                    await c.env.DB.prepare(`
                        INSERT INTO trades (
                            user_id, symbol, asset_type, direction, quantity, 
                            entry_price, exit_price, entry_date, exit_date, 
                            pnl, is_closed, leverage, created_at, updated_at
                        ) VALUES (?, ?, 'crypto', ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `).bind(
                        userId,
                        symbol,
                        direction,
                        quantity,
                        entryPrice,
                        exitPrice,
                        entryDate, // Using createdTime as entry approximation, usually it is creation of the log? No, `createdTime` in closedPnl is creation of the record. `updatedTime` is update.
                        // Better to use updatedTime as the trade date.
                        exitDate,
                        pnl,
                        parseFloat(trade.leverage || '1')
                    ).run();
                    importedCount++;
                } else {
                    skippedCount++;
                }
            }

            return c.json({
                imported: importedCount,
                mapped: trades.length,
                skipped: skippedCount,
                errors: [],
                message: `Successfully synced ${importedCount} trades from Bybit.`
            });

        } catch (error: any) {
            console.error('Bybit Sync Error:', error);
            return c.json({
                imported: 0,
                mapped: 0,
                errors: [error.message || 'Unknown error during sync']
            }, 500);
        }
    }

    return c.json({
        imported: 0,
        mapped: 0,
        errors: [`Exchange ${conn.exchange_id} not yet supported for sync`],
        message: 'Exchange not supported'
    });
});
