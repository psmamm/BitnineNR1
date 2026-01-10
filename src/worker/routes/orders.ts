/**
 * Order Execution API Routes
 * 
 * Handles order placement for Bybit V5 API with risk validation.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { placeBybitOrder, validateBybitRisk, type BybitOrderRequest } from '../utils/exchanges/BybitOrderExecution';
import { decrypt } from '../utils/encryption';
import type { D1Database } from '@cloudflare/workers-types';

const BybitOrderSchema = z.object({
  connectionId: z.string().uuid(),
  symbol: z.string(),
  side: z.enum(['Buy', 'Sell']),
  orderType: z.enum(['Market', 'Limit', 'Conditional']),
  qty: z.string(),
  price: z.string().optional(),
  stopLoss: z.string().optional(),
  takeProfit: z.string().optional(),
  leverage: z.string().optional(),
  marginMode: z.enum(['isolated', 'cross']).optional(),
  category: z.enum(['spot', 'linear', 'inverse', 'option']).default('linear')
});

export const ordersRouter = new Hono<{
  Bindings: {
    DB: D1Database;
    ENCRYPTION_MASTER_KEY: string;
  };
}>();

// Combined auth middleware
const combinedAuthMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

ordersRouter.use('*', combinedAuthMiddleware);

/**
 * POST /api/orders/bybit
 * Place an order on Bybit V5
 */
ordersRouter.post(
  '/bybit',
  zValidator('json', BybitOrderSchema),
  async (c) => {
    try {
      const user = c.get('user');
      // Middleware ensures user exists, but check userId for safety
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
      
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const data = c.req.valid('json');

      // Get exchange connection
      const connection = await c.env.DB.prepare(`
        SELECT * FROM exchange_connections 
        WHERE id = ? AND user_id = ? AND exchange_id = 'bybit'
      `).bind(data.connectionId, userId).first();

      if (!connection) {
        return c.json({ error: 'Exchange connection not found' }, 404);
      }

      const conn = connection as any;

      // Decrypt API keys for order execution (only in RAM)
      const masterKey = c.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        return c.json({ error: 'Encryption service unavailable' }, 500);
      }

      if (!conn.api_key_encrypted || !conn.api_secret_encrypted) {
        return c.json({ error: 'API credentials not found' }, 400);
      }

      // Decrypt keys - they will only exist in RAM during this request
      const apiKey = await decrypt(conn.api_key_encrypted, masterKey);
      const apiSecret = await decrypt(conn.api_secret_encrypted, masterKey);

      // Validate risk before placing order
      if (data.price && data.stopLoss) {
        const entryPrice = parseFloat(data.price);
        const stopLossPrice = parseFloat(data.stopLoss);
        const riskAmount = Math.abs(entryPrice - stopLossPrice) * parseFloat(data.qty);
        const leverage = data.leverage ? parseFloat(data.leverage) : 1;

        // Get user equity for risk validation
        // This would ideally come from a user equity service
        const riskValidation = await validateBybitRisk(
          apiKey,
          apiSecret,
          riskAmount,
          entryPrice,
          stopLossPrice,
          leverage,
          data.marginMode || 'isolated',
          data.symbol
        );

        if (!riskValidation.valid) {
          return c.json({ 
            error: 'Risk validation failed',
            reason: riskValidation.reason
          }, 400);
        }
      }

      // Place order
      const orderRequest: BybitOrderRequest = {
        apiKey,
        apiSecret,
        symbol: data.symbol,
        side: data.side,
        orderType: data.orderType,
        qty: data.qty,
        price: data.price,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        leverage: data.leverage,
        marginMode: data.marginMode,
        category: data.category
      };

      const orderResponse = await placeBybitOrder(orderRequest);

      // Keys go out of scope here - they are no longer in RAM
      // The decrypted keys are never logged or stored

      // Store order in database
      await c.env.DB.prepare(`
        INSERT INTO orders (
          user_id, exchange_id, connection_id, order_id, symbol, side, 
          order_type, qty, price, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      `).bind(
        userId,
        'bybit',
        data.connectionId,
        orderResponse.orderId,
        data.symbol,
        data.side,
        data.orderType,
        data.qty,
        data.price || null
      ).run();

      return c.json({
        success: true,
        order: orderResponse
      });
    } catch (error) {
      console.error('Order execution error:', error);
      return c.json({
        error: 'Failed to execute order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  }
);
