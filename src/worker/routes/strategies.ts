import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "@getmocha/users-service/backend";
import { getCookie } from "hono/cookie";

type Env = {
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  DB: D1Database;
};

const StrategySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  rules: z.string().optional(),
  risk_per_trade: z.number().positive().optional(),
  target_rr: z.number().positive().optional(),
  timeframe: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Combined auth middleware that supports both mocha sessions and Firebase sessions
const combinedAuthMiddleware = async (c: any, next: any) => {
  // First try the mocha auth middleware
  try {
    await authMiddleware(c, async () => {});
    if (c.get('user')) {
      return next();
    }
  } catch (e) {
    // Mocha auth failed, try Firebase session
  }

  // Try Firebase session as fallback
  const firebaseSession = getCookie(c, 'firebase_session');
  if (firebaseSession) {
    try {
      const userData = JSON.parse(firebaseSession);
      // Set user in context in the format expected by routes
      c.set('user', {
        google_user_data: {
          sub: userData.google_user_id || userData.sub,
          email: userData.email,
          name: userData.name,
        },
        firebase_user_id: userData.google_user_id || userData.sub,
        email: userData.email,
      });
      return next();
    } catch (e) {
      console.error('Error parsing Firebase session:', e);
    }
  }

  // Both auth methods failed
  return c.json({ error: 'Unauthorized' }, 401);
};

export const strategiesRouter = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Apply combined auth middleware to all routes in this router
strategiesRouter.use('*', combinedAuthMiddleware);

// Get all strategies for user
strategiesRouter.get('/', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

  const strategies = await c.env.DB.prepare(`
    SELECT s.*, 
           COUNT(t.id) as trade_count,
           AVG(CASE WHEN t.pnl > 0 THEN 1.0 ELSE 0.0 END) * 100 as win_rate,
           AVG(t.pnl) as avg_return,
           SUM(t.pnl) as total_pnl,
           MAX(t.entry_date) as last_used
    FROM strategies s
    LEFT JOIN trades t ON s.id = t.strategy_id AND t.user_id = s.user_id
    WHERE s.user_id = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).bind(userId).all();

  const formattedStrategies = strategies.results.map((strategy: any) => ({
    ...strategy,
    win_rate: strategy.win_rate ? Math.round(strategy.win_rate * 10) / 10 : 0,
    avg_return: strategy.avg_return ? Math.round(strategy.avg_return * 100) / 100 : 0,
    total_pnl: strategy.total_pnl ? Math.round(strategy.total_pnl * 100) / 100 : 0
  }));

  return c.json({ strategies: formattedStrategies });
});

// Get strategy performance details
strategiesRouter.get('/:id/performance', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
  const strategyId = c.req.param('id');

  const trades = await c.env.DB.prepare(`
    SELECT * FROM trades 
    WHERE user_id = ? AND strategy_id = ? AND is_closed = 1
    ORDER BY entry_date DESC
  `).bind(userId, strategyId).all();

  if (!trades.results.length) {
    return c.json({
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      bestTrade: 0,
      worstTrade: 0,
      trades: []
    });
  }

  const pnlValues = trades.results.map((t: any) => t.pnl || 0);
  const winningTrades = pnlValues.filter((pnl: number) => pnl > 0).length;
  const totalPnl = pnlValues.reduce((sum: number, pnl: number) => sum + pnl, 0);

  return c.json({
    totalTrades: trades.results.length,
    winRate: Math.round((winningTrades / trades.results.length) * 1000) / 10,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgPnl: Math.round((totalPnl / trades.results.length) * 100) / 100,
    bestTrade: Math.round(Math.max(...pnlValues) * 100) / 100,
    worstTrade: Math.round(Math.min(...pnlValues) * 100) / 100,
    trades: trades.results
  });
});

// Create new strategy
strategiesRouter.post('/', zValidator('json', StrategySchema), async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
  const strategy = c.req.valid('json');

  const result = await c.env.DB.prepare(`
    INSERT INTO strategies (
      user_id, name, description, category, rules, 
      risk_per_trade, target_rr, timeframe, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    strategy.name,
    strategy.description || null,
    strategy.category || null,
    strategy.rules || null,
    strategy.risk_per_trade || null,
    strategy.target_rr || null,
    strategy.timeframe || null,
    strategy.is_active !== false ? 1 : 0
  ).run();

  if (!result.success) {
    return c.json({ error: 'Failed to create strategy' }, 500);
  }

  return c.json({ id: result.meta.last_row_id, success: true }, 201);
});

// Update strategy
strategiesRouter.put('/:id', zValidator('json', StrategySchema), async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
  const strategyId = c.req.param('id');
  const strategy = c.req.valid('json');

  const result = await c.env.DB.prepare(`
    UPDATE strategies SET 
      name = ?, description = ?, category = ?, rules = ?,
      risk_per_trade = ?, target_rr = ?, timeframe = ?, is_active = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(
    strategy.name,
    strategy.description || null,
    strategy.category || null,
    strategy.rules || null,
    strategy.risk_per_trade || null,
    strategy.target_rr || null,
    strategy.timeframe || null,
    strategy.is_active !== false ? 1 : 0,
    strategyId,
    userId
  ).run();

  if (!result.success || result.meta.changes === 0) {
    return c.json({ error: 'Strategy not found or failed to update' }, 404);
  }

  return c.json({ success: true });
});

// Delete strategy
strategiesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
  const strategyId = c.req.param('id');

  // Check if strategy has trades
  const tradesCount: any = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM trades WHERE strategy_id = ?
  `).bind(strategyId).first();

  if (tradesCount && (tradesCount.count as number) > 0) {
    return c.json({ error: 'Cannot delete strategy with existing trades' }, 400);
  }

  const result = await c.env.DB.prepare(`
    DELETE FROM strategies WHERE id = ? AND user_id = ?
  `).bind(strategyId, userId).run();

  if (!result.success || result.meta.changes === 0) {
    return c.json({ error: 'Strategy not found' }, 404);
  }

  return c.json({ success: true });
});
