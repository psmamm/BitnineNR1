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

const TradeSchema = z.object({
  symbol: z.string().min(1),
  asset_type: z.enum(['stocks', 'crypto', 'forex']).optional(),
  direction: z.enum(['LONG', 'SHORT', 'long', 'short']), // Support both cases
  quantity: z.number().positive().optional(), // Optional if size is provided
  entry_price: z.number().positive(),
  exit_price: z.number().positive().optional(),
  entry_date: z.string().optional(), // Optional if entry_timestamp is provided
  exit_date: z.string().optional(), // Optional if exit_timestamp is provided
  entry_timestamp: z.number().int().optional(), // Unix timestamp
  exit_timestamp: z.number().int().optional(), // Unix timestamp
  size: z.number().positive().optional(), // Position size (e.g., in USD)
  strategy_id: z.number().optional(),
  commission: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  leverage: z.number().min(0.1).max(100).optional(),
  // AI Journaling fields
  voice_note_url: z.string().url().optional(),
  voice_transcription: z.string().optional(),
  emotion_tag: z.string().optional(),
  ai_analysis: z.string().optional(), // JSON string
  screenshot_url: z.string().url().optional(),
  playbook_validation: z.number().int().min(-1).max(1).optional(), // -1 = failed, 0 = not validated, 1 = passed
});

export const tradesRouter = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Combined auth middleware that supports both mocha sessions and Firebase sessions
const combinedAuthMiddleware = async (c: any, next: any) => {
  // First try the mocha auth middleware
  try {
    await authMiddleware(c, async () => { });
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

// Apply combined auth middleware to all routes in this router
tradesRouter.use('*', combinedAuthMiddleware);

// Get all trades for user
tradesRouter.get('/', async (c) => {
  console.log('GET /api/trades hit');
  const user = c.get('user');
  console.log('User in GET trades:', user?.google_user_data?.sub);
  const limit = Number(c.req.query('limit')) || 50;
  const offset = Number(c.req.query('offset')) || 0;
  const symbol = c.req.query('symbol');
  const direction = c.req.query('direction');
  const assetType = c.req.query('asset_type');
  const search = c.req.query('search');

  let query = `
    SELECT t.*, s.name as strategy_name 
    FROM trades t
    LEFT JOIN strategies s ON t.strategy_id = s.id
    WHERE t.user_id = ?
  `;
  const params: any[] = [user.google_user_data.sub];

  if (symbol) {
    query += ' AND t.symbol = ?';
    params.push(symbol.toUpperCase());
  }

  if (direction) {
    query += ' AND t.direction = ?';
    params.push(direction);
  }

  if (assetType) {
    query += ' AND t.asset_type = ?';
    params.push(assetType);
  }

  if (search) {
    query += ' AND (t.symbol LIKE ? OR t.notes LIKE ? OR t.tags LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY t.entry_date DESC, t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const trades = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    trades: trades.results,
    hasMore: trades.results.length === limit
  });
});

// Get trade statistics
tradesRouter.get('/stats', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data.sub;

  // Get basic stats
  const statsQuery = `
    SELECT 
      COUNT(*) as total_trades,
      COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
      COUNT(CASE WHEN pnl < 0 THEN 1 END) as losing_trades,
      SUM(pnl) as total_pnl,
      AVG(pnl) as avg_pnl,
      MAX(pnl) as best_trade,
      MIN(pnl) as worst_trade
    FROM trades 
    WHERE user_id = ? AND is_closed = 1
  `;

  const stats: any = await c.env.DB.prepare(statsQuery).bind(userId).first();

  if (!stats || stats.total_trades === 0) {
    return c.json({
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      bestTrade: 0,
      worstTrade: 0,
      profitFactor: 0
    });
  }

  const winRate = ((stats.winning_trades as number) / (stats.total_trades as number)) * 100;

  // Calculate profit factor
  const profitQuery = `
    SELECT 
      SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END) as gross_profit,
      SUM(CASE WHEN pnl < 0 THEN ABS(pnl) ELSE 0 END) as gross_loss
    FROM trades 
    WHERE user_id = ? AND is_closed = 1
  `;

  const profitData: any = await c.env.DB.prepare(profitQuery).bind(userId).first();
  const profitFactor = profitData && (profitData.gross_loss as number) > 0 ?
    (profitData.gross_profit as number) / (profitData.gross_loss as number) : 0;

  return c.json({
    totalTrades: stats.total_trades as number,
    winRate: Math.round(winRate * 10) / 10,
    totalPnl: Math.round((stats.total_pnl as number) * 100) / 100,
    avgPnl: Math.round((stats.avg_pnl as number) * 100) / 100,
    bestTrade: Math.round((stats.best_trade as number) * 100) / 100,
    worstTrade: Math.round((stats.worst_trade as number) * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100
  });
});

// Get aggregated daily stats for calendar
tradesRouter.get('/daily-stats', async (c) => {
  const user = c.get('user');
  const userId = user.google_user_data.sub;

  // Aggregate pnl by date (using exit_date or entry_date)
  // We strive to use exit_date for closed trades PnL realization
  const query = `
        SELECT 
            STRFTIME('%Y-%m-%d', COALESCE(exit_date, entry_date)) as date,
            COUNT(*) as trade_count,
            SUM(pnl) as daily_pnl,
            SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losses
        FROM trades
        WHERE user_id = ? AND is_closed = 1
        GROUP BY date
        ORDER BY date DESC
    `;

  const dailyStats = await c.env.DB.prepare(query).bind(userId).all();

  return c.json({ dailyStats: dailyStats.results });
});

// Add new trade
tradesRouter.post('/', zValidator('json', TradeSchema), async (c) => {
  try {
    console.log('POST /api/trades hit');
    const user = c.get('user');
    
    // Get user_id from Firebase token (security)
    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    if (!userId) {
      return c.json({ error: 'Unauthorized: User ID not found' }, 401);
    }

    // Check if user is currently locked out (Risk Management Kill Switch)
    try {
      const userRecord = await c.env.DB.prepare(`
        SELECT lockout_until FROM users WHERE google_user_id = ?
      `).bind(userId).first();

      if (userRecord?.lockout_until) {
        const lockoutUntil = userRecord.lockout_until as number;
        const now = Math.floor(Date.now() / 1000);
        
        if (lockoutUntil > now) {
          const lockoutDate = new Date(lockoutUntil * 1000);
          return c.json({ 
            error: 'Risk Lock active. Trading Log disabled until ' + lockoutDate.toISOString() 
          }, 403);
        }
      }
    } catch (lockoutCheckError) {
      // If columns don't exist yet (migration not run), continue normally
      console.log('Lockout check failed (columns may not exist):', lockoutCheckError);
    }

    const trade = c.req.valid('json');
    console.log('Trade data:', JSON.stringify(trade));

    // Normalize direction to uppercase
    const direction = trade.direction.toUpperCase() as 'LONG' | 'SHORT';
    
    // Generate UUID for the trade
    const uuid = crypto.randomUUID();
    
    // Handle timestamps: prefer entry_timestamp/exit_timestamp, fallback to entry_date/exit_date
    let entryTimestamp: number | null = null;
    let exitTimestamp: number | null = null;
    
    if (trade.entry_timestamp) {
      entryTimestamp = trade.entry_timestamp;
    } else if (trade.entry_date) {
      // Convert date string to Unix timestamp
      entryTimestamp = Math.floor(new Date(trade.entry_date).getTime() / 1000);
    } else {
      // Default to current time
      entryTimestamp = Math.floor(Date.now() / 1000);
    }
    
    if (trade.exit_timestamp) {
      exitTimestamp = trade.exit_timestamp;
    } else if (trade.exit_date) {
      exitTimestamp = Math.floor(new Date(trade.exit_date).getTime() / 1000);
    }

    // Calculate position size: prefer size, fallback to quantity * entry_price
    const positionSize = trade.size || (trade.quantity ? trade.quantity * trade.entry_price : null);
    if (!positionSize) {
      return c.json({ error: 'Either size or quantity must be provided' }, 400);
    }

    // Calculate P&L if exit price is provided
    let pnl = null;
    let pnlNet = null;
    let pnlPercent = null;
    let isWin = null;
    let is_closed = 0;

    if (trade.exit_price) {
      const multiplier = direction === 'LONG' ? 1 : -1;
      const leverage = trade.leverage || 1;
      
      // Calculate P&L: (exit_price - entry_price) * size * multiplier * leverage
      const rawPnl = (trade.exit_price - trade.entry_price) * positionSize * multiplier * leverage;
      
      // Subtract commission from P&L
      const commission = trade.commission || 0;
      pnlNet = rawPnl - commission;
      pnl = pnlNet; // Keep pnl for backward compatibility
      
      // Calculate percentage P&L
      pnlPercent = ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100 * multiplier * leverage;
      
      // Determine if it's a win or loss
      isWin = pnlNet > 0 ? 1 : (pnlNet < 0 ? 0 : null);
      is_closed = 1;
    }

    console.log('Attempting to insert trade into database...');
    
    // Try to insert with all new columns first, fallback to basic insert if columns don't exist
    let result;
    try {
      result = await c.env.DB.prepare(`
        INSERT INTO trades (
          user_id, uuid, symbol, asset_type, direction, quantity, size, entry_price, exit_price,
          entry_date, exit_date, entry_timestamp, exit_timestamp, strategy_id, commission, 
          notes, tags, pnl, pnl_net, pnl_percent, is_closed, leverage,
          voice_note_url, voice_transcription, emotion_tag, ai_analysis, screenshot_url, playbook_validation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        uuid,
        trade.symbol.toUpperCase(),
        trade.asset_type || null,
        direction,
        trade.quantity || null,
        positionSize,
        trade.entry_price,
        trade.exit_price || null,
        trade.entry_date || null,
        trade.exit_date || null,
        entryTimestamp,
        exitTimestamp,
        trade.strategy_id || null,
        trade.commission || null,
        trade.notes || null,
        trade.tags || null,
        pnl,
        pnlNet,
        pnlPercent,
        is_closed,
        trade.leverage || 1,
        trade.voice_note_url || null,
        trade.voice_transcription || null,
        trade.emotion_tag || null,
        trade.ai_analysis || null,
        trade.screenshot_url || null,
        trade.playbook_validation || 0
      ).run();
    } catch (insertError: any) {
      // If new columns don't exist, try basic insert
      console.log('Full insert failed, trying basic insert:', insertError);
      try {
        // Calculate quantity from size if quantity is not provided
        const calculatedQuantity = trade.quantity || (positionSize && trade.entry_price ? Math.round(positionSize / trade.entry_price) : null);
        
        result = await c.env.DB.prepare(`
          INSERT INTO trades (
            user_id, symbol, asset_type, direction, quantity, entry_price, exit_price,
            entry_date, exit_date, strategy_id, commission, notes, tags, pnl, is_closed, leverage
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId,
          trade.symbol.toUpperCase(),
          trade.asset_type || null,
          direction,
          calculatedQuantity,
          trade.entry_price,
          trade.exit_price || null,
          trade.entry_date || new Date().toISOString().split('T')[0],
          trade.exit_date || null,
          trade.strategy_id || null,
          trade.commission || null,
          trade.notes || null,
          trade.tags || null,
          pnl,
          is_closed,
          trade.leverage || 1
        ).run();
      } catch (basicError) {
        console.error('Both insert attempts failed:', basicError);
        throw new Error(`Failed to insert trade: ${basicError instanceof Error ? basicError.message : String(basicError)}`);
      }
    }

    console.log('Database insert result:', JSON.stringify(result));

    if (!result.success) {
      console.error('Database insert failed:', result);
      return c.json({ error: 'Failed to create trade' }, 500);
    }

    console.log('Trade created successfully with ID:', result.meta.last_row_id);

    // ============================================================================
    // RISK MANAGEMENT: Check daily loss and trigger lockout if limit reached
    // ============================================================================
    let riskLockTriggered = false;
    if (is_closed === 1 && pnlNet !== null && pnlNet < 0) {
      try {
        // Get user risk settings
        const riskSettings = await c.env.DB.prepare(`
          SELECT risk_lock_enabled, max_daily_loss FROM users WHERE google_user_id = ?
        `).bind(userId).first();

        if (riskSettings?.risk_lock_enabled === 1 && riskSettings?.max_daily_loss) {
          // Calculate start of today (UTC)
          const now = new Date();
          const startOfDay = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
          ));
          const startOfDayTimestamp = Math.floor(startOfDay.getTime() / 1000);

          // Calculate cumulative daily PnL (only losses count)
          const dailyPnLResult: any = await c.env.DB.prepare(`
            SELECT COALESCE(SUM(pnl_net), 0) as daily_loss
            FROM trades
            WHERE user_id = ? 
              AND is_closed = 1 
              AND pnl_net < 0
              AND (
                exit_timestamp >= ? OR 
                (exit_timestamp IS NULL AND entry_timestamp >= ?) OR
                (exit_timestamp IS NULL AND entry_timestamp IS NULL AND created_at >= ?)
              )
          `).bind(userId, startOfDayTimestamp, startOfDayTimestamp, startOfDay.toISOString()).first();

          const dailyLoss = dailyPnLResult?.daily_loss || 0;
          const maxDailyLoss = riskSettings.max_daily_loss as number;

          // Trigger lockout if daily loss limit reached
          if (Math.abs(dailyLoss) >= Math.abs(maxDailyLoss)) {
            // Set lockout until tomorrow 06:00 UTC
            const tomorrow = new Date(startOfDay);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            tomorrow.setUTCHours(6, 0, 0, 0);
            const lockoutUntil = Math.floor(tomorrow.getTime() / 1000);

            await c.env.DB.prepare(`
              UPDATE users 
              SET lockout_until = ?, updated_at = CURRENT_TIMESTAMP
              WHERE google_user_id = ?
            `).bind(lockoutUntil, userId).run();

            console.log(`Risk lock triggered for user ${userId}. Daily loss: ${dailyLoss}, Limit: ${maxDailyLoss}`);
            riskLockTriggered = true;
          }
        }
      } catch (riskError) {
        console.error('Error checking risk lock (non-critical):', riskError);
        // Don't fail trade creation if risk check fails
      }
    }

    // ============================================================================
    // GAMIFICATION HOOK: Award XP for journaling
    // ============================================================================
    try {
      // Increase user XP by +10 points for journaling a trade
      const xpUpdate = await c.env.DB.prepare(`
        UPDATE users 
        SET xp = COALESCE(xp, 0) + 10,
            updated_at = CURRENT_TIMESTAMP
        WHERE google_user_id = ?
      `).bind(userId).run();

      if (xpUpdate.success) {
        console.log(`Awarded +10 XP to user ${userId} for journaling trade`);
      }
    } catch (xpError) {
      console.error('Failed to award XP (non-critical):', xpError);
      // Don't fail the trade creation if XP update fails
    }

    // Create notification if trade alerts are enabled
    try {
      const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
      if (userId) {
        // Ensure notifications table exists
        try {
          await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS notifications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              message TEXT NOT NULL,
              time TEXT NOT NULL,
              read BOOLEAN DEFAULT 0,
              data TEXT,
              action_label TEXT,
              action_url TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
        } catch (e) {
          // Table might already exist
        }

        // Check user notification settings
        const userRecord = await c.env.DB.prepare(`
          SELECT notification_settings FROM users WHERE google_user_id = ?
        `).bind(userId).first();

        let notificationSettings = {
          tradeAlerts: true,
          performanceReports: true,
          productUpdates: false
        };

        if (userRecord?.notification_settings) {
          try {
            notificationSettings = JSON.parse(userRecord.notification_settings as string);
          } catch (e) {
            // Use defaults
          }
        }

        if (notificationSettings.tradeAlerts) {
          // Check if notification for this trade already exists
          const existingNotification = await c.env.DB.prepare(`
            SELECT id FROM notifications 
            WHERE user_id = ? AND type = 'trade' AND data = ?
            LIMIT 1
          `).bind(userId, JSON.stringify({ tradeId: result.meta.last_row_id })).first();

          if (!existingNotification) {
            const formatTime = (date: Date): string => {
              const now = new Date();
              const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
              if (diffInSeconds < 60) return 'Just now';
              if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
              if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
              return `${Math.floor(diffInSeconds / 86400)}d ago`;
            };

            const title = trade.exit_price
              ? `✅ Trade Closed: ${trade.symbol} ${trade.direction.toUpperCase()}`
              : `📊 New Trade: ${trade.symbol} ${trade.direction.toUpperCase()}`;

            const positionDisplay = trade.size 
              ? `${trade.size.toFixed(2)} (size)` 
              : (trade.quantity ? `${trade.quantity} units` : 'N/A');
            
            const message = trade.exit_price && pnl
              ? `${positionDisplay} ${trade.symbol} ${direction} - P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`
              : `${positionDisplay} ${trade.symbol} ${direction} @ ${trade.entry_price}`;

            await c.env.DB.prepare(`
              INSERT INTO notifications (user_id, type, title, message, time, read, data, created_at, updated_at)
              VALUES (?, 'trade', ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(
              userId,
              title,
              message,
              formatTime(new Date()),
              JSON.stringify({ tradeId: result.meta.last_row_id })
            ).run();
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to create trade notification:', notifError);
      // Don't fail the trade creation if notification fails
    }

    return c.json({ 
      id: result.meta.last_row_id,
      uuid: uuid,
      success: true,
      pnl: pnl,
      pnlNet: pnlNet,
      pnlPercent: pnlPercent,
      isWin: isWin,
      isClosed: is_closed === 1,
      xpAwarded: 10,
      risk_lock_triggered: riskLockTriggered
    }, 201);
  } catch (error) {
    console.error('Error in POST /api/trades:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide more detailed error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDatabaseError = errorMessage.includes('no such column') || errorMessage.includes('no such table');
    
    return c.json({
      error: isDatabaseError 
        ? 'Database schema mismatch. Please run migrations.' 
        : 'Internal server error',
      details: errorMessage
    }, 500);
  }
});

// Update trade
tradesRouter.put('/:id', zValidator('json', TradeSchema), async (c) => {
  const user = c.get('user');
  const tradeId = c.req.param('id');
  const trade = c.req.valid('json');

  // Get existing trade to determine position size
  const existingTrade = await c.env.DB.prepare(`
    SELECT size, quantity, entry_price, direction, is_closed FROM trades WHERE id = ? AND user_id = ?
  `).bind(tradeId, user.google_user_data?.sub || (user as any).firebase_user_id).first<{
    size: number | null;
    quantity: number | null;
    entry_price: number;
    direction: string;
    is_closed: number;
  }>();

  if (!existingTrade) {
    return c.json({ error: 'Trade not found' }, 404);
  }

  // Calculate position size: prefer new size, then existing size, then quantity * entry_price
  const existingSize = existingTrade.size || null;
  const existingQuantity = existingTrade.quantity || null;
  const existingEntryPrice = existingTrade.entry_price;
  
  const positionSize = trade.size || existingSize || 
    (trade.quantity ? trade.quantity * trade.entry_price : 
     (existingQuantity ? existingQuantity * (trade.entry_price || existingEntryPrice) : null));

  // Normalize direction
  const direction = (trade.direction?.toUpperCase() || existingTrade.direction?.toUpperCase() || 'LONG') as 'LONG' | 'SHORT';

  // Calculate P&L if exit price is provided
  let pnl: number | null = null;
  let pnlNet: number | null = null;
  let pnlPercent: number | null = null;
  let is_closed = 0;

  if (trade.exit_price && positionSize) {
    const multiplier = direction === 'LONG' ? 1 : -1;
    const leverage = trade.leverage || 1;
    const entryPrice = trade.entry_price || existingEntryPrice;
    
    // Calculate P&L: (exit_price - entry_price) * size * multiplier * leverage
    const rawPnl = (trade.exit_price - entryPrice) * positionSize * multiplier * leverage;
    
    // Subtract commission from P&L
    const commission = trade.commission || 0;
    pnlNet = rawPnl - commission;
    pnl = pnlNet; // Keep pnl for backward compatibility
    
    // Calculate percentage P&L
    pnlPercent = ((trade.exit_price - entryPrice) / entryPrice) * 100 * multiplier * leverage;
    
    is_closed = 1;
  }

  // Check if trade was previously open and is now being closed
  const wasOpen = existingTrade.is_closed === 0;
  const isNowClosed = trade.exit_price && is_closed === 1;

  // Handle timestamps
  let entryTimestamp: number | null = null;
  let exitTimestamp: number | null = null;
  
  if (trade.entry_timestamp) {
    entryTimestamp = trade.entry_timestamp;
  } else if (trade.entry_date) {
    entryTimestamp = Math.floor(new Date(trade.entry_date).getTime() / 1000);
  }
  
  if (trade.exit_timestamp) {
    exitTimestamp = trade.exit_timestamp;
  } else if (trade.exit_date) {
    exitTimestamp = Math.floor(new Date(trade.exit_date).getTime() / 1000);
  }

  const result = await c.env.DB.prepare(`
    UPDATE trades SET 
      symbol = ?, asset_type = ?, direction = ?, quantity = ?, size = ?, entry_price = ?, exit_price = ?,
      entry_date = ?, exit_date = ?, entry_timestamp = COALESCE(?, entry_timestamp), 
      exit_timestamp = COALESCE(?, exit_timestamp), strategy_id = ?, commission = ?, notes = ?, tags = ?, 
      pnl = ?, pnl_net = ?, pnl_percent = ?, is_closed = ?, leverage = ?, updated_at = CURRENT_TIMESTAMP,
      voice_note_url = COALESCE(?, voice_note_url),
      voice_transcription = COALESCE(?, voice_transcription),
      emotion_tag = COALESCE(?, emotion_tag),
      ai_analysis = COALESCE(?, ai_analysis),
      screenshot_url = COALESCE(?, screenshot_url),
      playbook_validation = COALESCE(?, playbook_validation)
    WHERE id = ? AND user_id = ?
  `).bind(
    trade.symbol?.toUpperCase() || null,
    trade.asset_type || null,
    direction,
    trade.quantity || null,
    positionSize,
    trade.entry_price || null,
    trade.exit_price || null,
    trade.entry_date || null,
    trade.exit_date || null,
    entryTimestamp,
    exitTimestamp,
    trade.strategy_id || null,
    trade.commission || null,
    trade.notes || null,
    trade.tags || null,
    pnl,
    pnlNet,
    pnlPercent,
    is_closed,
    trade.leverage || null,
    trade.voice_note_url || null,
    trade.voice_transcription || null,
    trade.emotion_tag || null,
    trade.ai_analysis || null,
    trade.screenshot_url || null,
    trade.playbook_validation || null,
    tradeId,
    user.google_user_data?.sub || (user as any).firebase_user_id
  ).run();

  if (!result.success || result.meta.changes === 0) {
    return c.json({ error: 'Trade not found or failed to update' }, 404);
  }

  // Create notification if trade was just closed and trade alerts are enabled
  if (wasOpen && isNowClosed) {
    try {
      const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
      if (userId) {
        // Ensure notifications table exists
        try {
          await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS notifications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              message TEXT NOT NULL,
              time TEXT NOT NULL,
              read BOOLEAN DEFAULT 0,
              data TEXT,
              action_label TEXT,
              action_url TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
        } catch (e) {
          // Table might already exist
        }

        // Check user notification settings
        const userRecord = await c.env.DB.prepare(`
          SELECT notification_settings FROM users WHERE google_user_id = ?
        `).bind(userId).first();

        let notificationSettings = {
          tradeAlerts: true,
          performanceReports: true,
          productUpdates: false
        };

        if (userRecord?.notification_settings) {
          try {
            notificationSettings = JSON.parse(userRecord.notification_settings as string);
          } catch (e) {
            // Use defaults
          }
        }

        if (notificationSettings.tradeAlerts && pnl !== null) {
          // Check if notification for this trade close already exists
          const existingNotification = await c.env.DB.prepare(`
            SELECT id FROM notifications 
            WHERE user_id = ? AND type = 'trade' AND data = ?
            LIMIT 1
          `).bind(userId, JSON.stringify({ tradeId: parseInt(tradeId), closed: true })).first();

          if (!existingNotification) {
            const formatTime = (date: Date): string => {
              const now = new Date();
              const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
              if (diffInSeconds < 60) return 'Just now';
              if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
              if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
              return `${Math.floor(diffInSeconds / 86400)}d ago`;
            };

            const title = `✅ Trade Closed: ${trade.symbol} ${trade.direction.toUpperCase()}`;
            const message = `${trade.quantity} ${trade.symbol} ${trade.direction} - P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;

            await c.env.DB.prepare(`
              INSERT INTO notifications (user_id, type, title, message, time, read, data, created_at, updated_at)
              VALUES (?, 'trade', ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(
              userId,
              title,
              message,
              formatTime(new Date()),
              JSON.stringify({ tradeId: parseInt(tradeId), closed: true })
            ).run();
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to create trade close notification:', notifError);
      // Don't fail the trade update if notification fails
    }
  }

  return c.json({ success: true });
});

// Delete trade
tradesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const tradeId = c.req.param('id');

  const result = await c.env.DB.prepare(`
    DELETE FROM trades WHERE id = ? AND user_id = ?
  `).bind(tradeId, user.google_user_data.sub).run();

  if (!result.success || result.meta.changes === 0) {
    return c.json({ error: 'Trade not found' }, 404);
  }

  return c.json({ success: true });
});

// Get equity curve data
tradesRouter.get('/equity-curve', async (c) => {
  const user = c.get('user');
  const days = Number(c.req.query('days')) || 365;

  // Get portfolio snapshots or calculate from trades
  let equityData = await c.env.DB.prepare(`
    SELECT date, total_value, daily_pnl
    FROM portfolio_snapshots 
    WHERE user_id = ? 
    ORDER BY date DESC 
    LIMIT ?
  `).bind(user.google_user_data.sub, days).all();

  if (!equityData.results.length) {
    // Fallback: calculate from trades
    const trades = await c.env.DB.prepare(`
      SELECT entry_date, exit_date, pnl
      FROM trades 
      WHERE user_id = ? AND is_closed = 1
      ORDER BY entry_date
    `).bind(user.google_user_data.sub).all();

    const startingBalance = 10000; // Default starting balance
    let runningBalance = startingBalance;
    const dataPoints: any[] = [];

    for (const trade of trades.results) {
      runningBalance += (trade.pnl as number) || 0;
      dataPoints.push({
        date: trade.exit_date || trade.entry_date,
        value: Math.round(runningBalance * 100) / 100
      });
    }

    return c.json({ data: dataPoints });
  }

  return c.json({
    data: equityData.results.map((point: any) => ({
      date: point.date,
      value: point.total_value
    }))
  });
});
