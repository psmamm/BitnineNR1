import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import { tradesRouter } from "./routes/trades";
import { strategiesRouter } from "./routes/strategies";
import { whaleTransactionsRouter } from "./routes/whale-transactions";
import { debugWhaleRouter } from "./routes/debug-whale";
import { cryptoNewsRouter } from "./routes/crypto-news";
import { competitionRouter } from "./routes/competition";
import { exchangeConnectionsRouter } from "./routes/exchange-connections";
import { audioRouter } from "./routes/audio";
import { sbtIssuerRouter } from "./routes/sbt-issuer";
import { ordersRouter } from "./routes/orders";
import { apiKeysRouter } from "./routes/api-keys";
import { reportsRouter } from "./routes/reports";
import { tradeReplayRouter } from "./routes/trade-replay";
import { voiceJournalRouter } from "./routes/voice-journal";
import { aiCloneRouter } from "./routes/ai-clone";
import { autoTradingRouter } from "./routes/auto-trading";
import { subscriptionsRouter } from "./routes/subscriptions";
import { discipline } from "./routes/discipline";
import { twoFactorRouter } from "./routes/two-factor";
import { securityRouter } from "./routes/security";
import { lighterRouter } from "./routes/lighter";
import { errorHandlerMiddleware } from "./utils/errorHandler";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";



interface UserVariable {
  google_user_data?: {
    sub: string;
    email?: string;
    name?: string;
  };
  firebase_user_id?: string;
  email?: string;
}

// Firebase session auth middleware
const firebaseAuthMiddleware = async (c: unknown, next: () => Promise<void>) => {
  // Type assertion for Hono context
  const context = c as {
    get: (key: string) => UserVariable | undefined;
    set: (key: string, value: UserVariable) => void;
    json: (data: unknown, status?: number) => Response;
  };

  // Try Firebase session
  const firebaseSession = getCookie(context as Parameters<typeof getCookie>[0], 'firebase_session');
  if (firebaseSession) {
    try {
      const userData = JSON.parse(firebaseSession) as { google_user_id?: string; sub?: string; email?: string; name?: string };
      // Set user in context in the format expected by routes
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

  // Auth failed
  return context.json({ error: 'Unauthorized' }, 401);
};



type Env = {
  ETHERSCAN_API_KEY: string;
  BSCSCAN_API_KEY: string;
  SNOWTRACE_API_KEY: string;
  ARBISCAN_API_KEY: string;
  OPTIMISM_API_KEY: string;
  TRON_API_KEY: string;
  SOLSCAN_API_KEY: string;
  HUME_API_KEY: string;
  HUME_SECRET_KEY: string;
  ISSUER_PRIVATE_KEY: string;
  ENCRYPTION_MASTER_KEY: string;
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  AI: unknown; // Cloudflare Workers AI binding
};

const app = new Hono<{ Bindings: Env; Variables: { user?: UserVariable } }>();

// Middleware: CORS für alle Routen aktivieren
// Dynamic origin check to allow all *.circl.pages.dev subdomains
app.use("*", cors({
  origin: (origin) => {
    // Allow localhost for development
    if (origin?.startsWith('http://localhost:')) return origin;
    // Allow all Cloudflare Pages deployments for circl project
    if (origin?.endsWith('.circl.pages.dev')) return origin;
    if (origin === 'https://circl.pages.dev') return origin;
    // Reject unknown origins
    return null;
  },
  credentials: true,
}));

// Middleware: Centralized error handling
app.use("*", errorHandlerMiddleware());

// OAuth routes removed - using Firebase authentication directly

// Get user performance data
app.get("/api/users/me", firebaseAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Extract user_id from token (Firebase UID)
    const userId = user.google_user_data?.sub || user.firebase_user_id;
    const userEmail = user.email || user.google_user_data?.email;
    const userName = user.google_user_data?.name || userEmail?.split('@')[0] || 'User';

    if (!userId) {
      return c.json({ error: 'User ID not found in token' }, 401);
    }

    // Try to fetch user from database
    let dbUser: {
      username?: string | null;
      xp?: number | null;
      rank_tier?: string | null;
      reputation_score?: number | null;
      email?: string | null;
      name?: string | null;
      lockout_until?: string | null;
    } | null = null;
    try {
      dbUser = await c.env.DB.prepare(`
        SELECT 
          username,
          xp,
          rank_tier,
          reputation_score,
          email,
          name,
          lockout_until
        FROM users 
        WHERE google_user_id = ?
      `).bind(userId).first();
    } catch (queryError) {
      // If columns don't exist yet, try simpler query
      console.log('Full query failed, trying basic query:', queryError);
      try {
        dbUser = await c.env.DB.prepare(`
          SELECT 
            email,
            name
          FROM users 
          WHERE google_user_id = ?
        `).bind(userId).first<{
          email: string | null;
          name: string | null;
        }>();
        
        // If user exists but columns are missing, return defaults
        if (dbUser) {
          dbUser = {
            ...dbUser,
            username: null,
            xp: 0,
            rank_tier: 'BRONZE',
            reputation_score: 100,
            lockout_until: null,
          };
        }
      } catch (basicError) {
        console.error('Basic query also failed:', basicError);
        dbUser = null;
      }
    }

    // Auto-create user if they don't exist (first login)
    if (!dbUser) {
      console.log(`Auto-creating user ${userId} in database (first login)`);
      
      try {
        // Try to insert with all new columns first
        let insertResult;
        try {
          insertResult = await c.env.DB.prepare(`
            INSERT INTO users (
              email,
              name,
              google_user_id,
              username,
              xp,
              rank_tier,
              reputation_score,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(
            userEmail || '',
            userName,
            userId,
            null, // username will be set later by user
            0, // Default XP
            'BRONZE', // Default rank tier
            100 // Default reputation score
          ).run();
        } catch (insertError) {
          // If new columns don't exist, try basic insert
          console.log('Full insert failed, trying basic insert:', insertError);
          insertResult = await c.env.DB.prepare(`
            INSERT INTO users (
              email,
              name,
              google_user_id,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(
            userEmail || '',
            userName,
            userId
          ).run();
        }

        if (!insertResult.success) {
          console.error('Failed to create user:', insertResult);
          return c.json({ error: 'Failed to create user account' }, 500);
        }

        // Fetch the newly created user
        try {
          dbUser = await c.env.DB.prepare(`
            SELECT 
              username,
              xp,
              rank_tier,
              reputation_score,
              email,
              name
            FROM users 
            WHERE google_user_id = ?
          `).bind(userId).first<{
            username: string | null;
            xp: number | null;
            rank_tier: string | null;
            reputation_score: number | null;
            email: string | null;
            name: string | null;
          }>();
        } catch (fetchError) {
          // If columns don't exist, fetch basic data and add defaults
          console.log('Full fetch failed, trying basic fetch:', fetchError);
          const basicUser = await c.env.DB.prepare(`
            SELECT email, name FROM users WHERE google_user_id = ?
          `).bind(userId).first<{ email: string | null; name: string | null }>();
          
          if (basicUser) {
            dbUser = {
              ...basicUser,
              username: null,
              xp: 0,
              rank_tier: 'BRONZE',
              reputation_score: 100,
            };
          }
        }

        if (!dbUser) {
          return c.json({ error: 'User created but could not be retrieved' }, 500);
        }
      } catch (createError) {
        console.error('Error creating user:', createError);
        return c.json({ 
          error: 'Failed to create user account',
          details: createError instanceof Error ? createError.message : String(createError)
        }, 500);
      }
    }

    // Calculate current_streak (consecutive days with at least one trade)
    let currentStreak = 0;
    try {
      // Get all unique trading dates for this user, ordered by date descending
      // Use a simpler query that works with both timestamp and date columns
      let tradingDates;
      
      try {
        // Try query with timestamps first (if columns exist)
        tradingDates = await c.env.DB.prepare(`
          SELECT DISTINCT 
            CASE 
              WHEN entry_timestamp IS NOT NULL THEN date(entry_timestamp, 'unixepoch')
              WHEN exit_timestamp IS NOT NULL THEN date(exit_timestamp, 'unixepoch')
              WHEN entry_date IS NOT NULL THEN date(entry_date)
              ELSE date(created_at)
            END as trade_date
          FROM trades
          WHERE user_id = ?
          ORDER BY trade_date DESC
          LIMIT 30
        `).bind(userId).all<{ trade_date: string }>();
      } catch (timestampError) {
        // Fallback to simpler query if timestamp columns don't exist yet
        console.log('Timestamp query failed, using date-only query:', timestampError);
        tradingDates = await c.env.DB.prepare(`
          SELECT DISTINCT 
            date(COALESCE(exit_date, entry_date, created_at)) as trade_date
          FROM trades
          WHERE user_id = ?
          ORDER BY trade_date DESC
          LIMIT 30
        `).bind(userId).all<{ trade_date: string }>();
      }

      if (tradingDates && tradingDates.results && tradingDates.results.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        // Check if user traded today or yesterday (allow timezone differences)
        const yesterday = new Date(today.getTime() - 86400000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const firstTradeDate = tradingDates.results[0].trade_date;
        const isRecent = firstTradeDate === todayStr || firstTradeDate === yesterdayStr;

        if (!isRecent) {
          // No recent trade, streak is 0
          currentStreak = 0;
        } else {
          // Count consecutive days with trades
          let expectedDate = new Date(today);
          let streakCount = 0;
          let isFirstCheck = true;

          for (const trade of tradingDates.results) {
            const tradeDate = new Date(trade.trade_date);
            tradeDate.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.floor((expectedDate.getTime() - tradeDate.getTime()) / 86400000);
            
            if (isFirstCheck && (daysDiff === 0 || daysDiff === 1)) {
              // Today or yesterday - start the streak
              streakCount = 1;
              expectedDate = new Date(tradeDate.getTime() - 86400000);
              isFirstCheck = false;
            } else if (!isFirstCheck && daysDiff === 0) {
              // Consecutive day found
              streakCount++;
              expectedDate = new Date(tradeDate.getTime() - 86400000);
            } else if (!isFirstCheck && daysDiff > 0) {
              // Gap found, streak is broken
              break;
            }
          }
          
          currentStreak = streakCount;
        }
      }
    } catch (streakError) {
      console.error('Error calculating streak (non-critical):', streakError);
      // Don't fail the request if streak calculation fails
      currentStreak = 0;
    }

    // Return performance data (ensure all fields exist even if columns don't)
    return c.json({
      username: dbUser?.username ?? null,
      xp: dbUser?.xp ?? 0, // Return as "reputation" in frontend
      rank_tier: dbUser?.rank_tier ?? 'BRONZE',
      reputation_score: dbUser?.reputation_score ?? 100,
      current_streak: currentStreak,
      email: dbUser?.email ?? userEmail ?? '',
      name: dbUser?.name ?? userName ?? 'User',
      lockout_until: dbUser?.lockout_until ?? null // Risk management lockout timestamp
    });
  } catch (error) {
    console.error('Error in GET /api/users/me:', error);
    return c.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Call this from the frontend to log out the user
app.get('/api/logout', async (c) => {
  // Firebase handles logout on the client side
  // This endpoint is kept for compatibility but doesn't need to do anything
  // The frontend will clear the Firebase session
  return c.json({ success: true }, 200);
});

// Update user profile
app.put('/api/users/profile', firebaseAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const { displayName, avatarIcon } = body;
  // Get userId from Firebase auth
  const userId = user.google_user_data?.sub || user.firebase_user_id;
  const userEmail = user.email || user.google_user_data?.email;

  console.log('Profile update request:', { displayName, avatarIcon, userId, userEmail });

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 400);
  }

  try {
    // First, check if user exists in database
    let userRecord = await c.env.DB.prepare(`
      SELECT id FROM users WHERE google_user_id = ?
    `).bind(userId).first();

    console.log('User record check:', userRecord);

    // If user doesn't exist, create them
    if (!userRecord) {
      const insertResult = await c.env.DB.prepare(`
        INSERT INTO users (email, name, google_user_id, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(userEmail || '', displayName || '', userId).run();

      console.log('User created:', insertResult);

      if (!insertResult.success) {
        return c.json({ error: 'Failed to create user record' }, 500);
      }
      userRecord = { id: insertResult.meta.last_row_id };
    }

    // Try to add avatar_icon column if it doesn't exist
    try {
      await c.env.DB.prepare(`ALTER TABLE users ADD COLUMN avatar_icon TEXT`).run();
      console.log('Added avatar_icon column');
    } catch (alterError) {
      // Column might already exist, which is fine
      const errorMessage = alterError instanceof Error ? alterError.message : String(alterError);
      if (errorMessage?.includes('duplicate column name') || errorMessage?.includes('duplicate')) {
        console.log('avatar_icon column already exists');
      } else {
        console.log('Note: avatar_icon column may already exist:', errorMessage);
      }
    }

    // Update user profile
    let result;
    try {
      result = await c.env.DB.prepare(`
        UPDATE users SET name = ?, avatar_icon = ?, updated_at = CURRENT_TIMESTAMP
        WHERE google_user_id = ?
      `).bind(displayName || null, avatarIcon || null, userId).run();

      console.log('Profile update result:', result);
    } catch (updateError) {
      const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
      console.error('Update error:', errorMessage);
      // If avatar_icon update fails, try without it
      if (errorMessage?.includes('no such column: avatar_icon')) {
        result = await c.env.DB.prepare(`
          UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP
          WHERE google_user_id = ?
        `).bind(displayName || null, userId).run();
        console.log('Profile update (without avatar):', result);
      } else {
        throw updateError;
      }
    }

    if (!result.success) {
      console.error('Update failed:', result);
      return c.json({ error: 'Failed to update profile' }, 500);
    }

    // Verify the update
    const updatedUser = await c.env.DB.prepare(`
      SELECT name, avatar_icon FROM users WHERE google_user_id = ?
    `).bind(userId).first();

    console.log('Updated user data:', updatedUser);

    return c.json({ success: true, data: updatedUser });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
    console.error('Profile update error:', error);
    return c.json({ error: errorMessage }, 500);
  }
});

// Get user starting capital
app.get('/api/users/starting-capital', firebaseAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const userId = user.google_user_data?.sub || user.firebase_user_id;

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 400);
  }

  try {
    // Try to add starting_capital column if it doesn't exist
    try {
      await c.env.DB.prepare(`ALTER TABLE users ADD COLUMN starting_capital REAL DEFAULT 10000`).run();
    } catch (alterError) {
      // Column might already exist, which is fine
      const errorMessage = alterError instanceof Error ? alterError.message : String(alterError);
      if (!errorMessage?.includes('duplicate column name') && !errorMessage?.includes('duplicate')) {
        console.log('Note: starting_capital column may already exist:', errorMessage);
      }
    }

    const dbUser = await c.env.DB.prepare(`
      SELECT starting_capital FROM users WHERE google_user_id = ?
    `).bind(userId).first();

    const startingCapital = dbUser?.starting_capital || 10000;

    return c.json({ success: true, startingCapital });
  } catch (error) {
    console.error('Failed to get starting capital:', error);
    return c.json({ success: true, startingCapital: 10000 }); // Return default on error
  }
});

// Update user starting capital
app.put('/api/users/starting-capital', firebaseAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const { startingCapital } = await c.req.json();
  const userId = user.google_user_data?.sub || user.firebase_user_id;

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 400);
  }

  if (!startingCapital || startingCapital <= 0) {
    return c.json({ error: 'Starting capital must be greater than 0' }, 400);
  }

  try {
    // Try to add starting_capital column if it doesn't exist
    try {
      await c.env.DB.prepare(`ALTER TABLE users ADD COLUMN starting_capital REAL DEFAULT 10000`).run();
    } catch (alterError) {
      // Column might already exist, which is fine
      const errorMessage = alterError instanceof Error ? alterError.message : String(alterError);
      if (!errorMessage?.includes('duplicate column name') && !errorMessage?.includes('duplicate')) {
        console.log('Note: starting_capital column may already exist:', errorMessage);
      }
    }

    // Check if user exists
    const userRecord = await c.env.DB.prepare(`
      SELECT id FROM users WHERE google_user_id = ?
    `).bind(userId).first();

    if (!userRecord) {
      const userEmail = user.email || user.google_user_data?.email;
      const insertResult = await c.env.DB.prepare(`
        INSERT INTO users (email, name, google_user_id, starting_capital, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(userEmail || '', user.google_user_data?.name || '', userId, startingCapital).run();

      if (!insertResult.success) {
        return c.json({ error: 'Failed to create user record' }, 500);
      }
    } else {
      // Update starting capital
      const result = await c.env.DB.prepare(`
        UPDATE users SET starting_capital = ?, updated_at = CURRENT_TIMESTAMP
        WHERE google_user_id = ?
      `).bind(startingCapital, userId).run();

      if (!result.success) {
        return c.json({ error: 'Failed to update starting capital' }, 500);
      }
    }

    return c.json({ success: true, startingCapital });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update starting capital';
    console.error('Failed to update starting capital:', error);
    return c.json({ error: errorMessage }, 500);
  }
});

// Get user settings
app.get('/api/users/settings', firebaseAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const userId = user.google_user_data?.sub || user.firebase_user_id;

  // Default settings to return if columns don't exist
  const defaultSettings = {
    notifications: {
      tradeAlerts: true,
      performanceReports: true,
      productUpdates: false
    },
    theme: 'dark',
    riskManagement: {
      risk_lock_enabled: false,
      max_daily_loss: null
    }
  };

  try {
    // Try to get settings with all columns
    const settings = await c.env.DB.prepare(`
      SELECT notification_settings, theme_preference, risk_lock_enabled, max_daily_loss FROM users WHERE google_user_id = ?
    `).bind(userId).first();

    return c.json({
      notifications: settings?.notification_settings ? JSON.parse(settings.notification_settings as string) : defaultSettings.notifications,
      theme: settings?.theme_preference || defaultSettings.theme,
      riskManagement: {
        risk_lock_enabled: settings?.risk_lock_enabled === 1 || false,
        max_daily_loss: settings?.max_daily_loss || null
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching user settings:', errorMessage);

    // If columns don't exist, return defaults
    if (errorMessage?.includes('no such column') || errorMessage?.includes('has no column named')) {
      console.log('Settings columns not found, returning defaults');
      return c.json(defaultSettings);
    }

    // Try basic query with just core columns
    try {
      const basicUser = await c.env.DB.prepare(`
        SELECT name FROM users WHERE google_user_id = ?
      `).bind(userId).first();

      if (basicUser) {
        return c.json(defaultSettings);
      }

      return c.json({ error: 'User not found' }, 404);
    } catch (fallbackError) {
      console.error('Fallback query failed:', fallbackError);
      return c.json(defaultSettings); // Return defaults on any error
    }
  }
});

// Update user settings
app.put('/api/users/settings', firebaseAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const { notifications, theme, riskManagement } = await c.req.json();
  const userId = user.google_user_data?.sub || user.firebase_user_id;

  // Prepare risk management values
  const riskLockEnabled = riskManagement?.risk_lock_enabled ? 1 : 0;
  const maxDailyLoss = riskManagement?.max_daily_loss !== undefined && riskManagement?.max_daily_loss !== null 
    ? riskManagement.max_daily_loss 
    : null;

  // Try to update with risk management fields, fallback if columns don't exist
  let result;
  try {
    result = await c.env.DB.prepare(`
      UPDATE users SET 
        notification_settings = ?, 
        theme_preference = ?, 
        risk_lock_enabled = ?,
        max_daily_loss = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE google_user_id = ?
    `).bind(
      JSON.stringify(notifications),
      theme,
      riskLockEnabled,
      maxDailyLoss,
      userId
    ).run();
  } catch (updateError) {
    // If risk management columns don't exist, update without them
    const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
    if (errorMessage?.includes('no such column')) {
      console.log('Risk management columns not found, updating without them');
      result = await c.env.DB.prepare(`
        UPDATE users SET 
          notification_settings = ?, 
          theme_preference = ?, 
          updated_at = CURRENT_TIMESTAMP
        WHERE google_user_id = ?
      `).bind(
        JSON.stringify(notifications),
        theme,
        userId
      ).run();
    } else {
      throw updateError;
    }
  }

  if (!result.success) {
    return c.json({ error: 'Failed to update settings' }, 500);
  }

  return c.json({ success: true });
});

// Exchange Firebase token for backend session
app.post('/api/auth/firebase-session', async (c) => {
  try {
    const { idToken } = await c.req.json();

    if (!idToken) {
      return c.json({ error: 'Firebase ID token is required' }, 400);
    }

    // Verify Firebase token (in production, use Firebase Admin SDK)
    // For now, we'll decode it and extract user info
    // Note: This is a simplified version - in production, verify the token properly
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      return c.json({ error: 'Invalid token format' }, 400);
    }

    // Decode the payload (base64url decode) - Cloudflare Workers compatible
    const base64Url = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const base64 = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
    const payload = JSON.parse(
      atob(base64)
    );

    // Extract user info from Firebase token
    const googleUserId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    // Check if user exists in database
    const userRecord = await c.env.DB.prepare(`
      SELECT id, google_user_id FROM users WHERE google_user_id = ?
    `).bind(googleUserId).first();

    if (!userRecord) {
      // Create user if doesn't exist
      const result = await c.env.DB.prepare(`
        INSERT INTO users (email, name, google_user_id) 
        VALUES (?, ?, ?)
      `).bind(email || '', name || '', googleUserId).run();

      if (!result.success) {
        return c.json({ error: 'Failed to create user' }, 500);
      }
    }

    // Set a Firebase session cookie that our combined auth middleware can use
    setCookie(c, 'firebase_session', JSON.stringify({
      google_user_id: googleUserId,
      email,
      name,
      sub: googleUserId
    }), {
      httpOnly: true,
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return c.json({ success: true, userId: googleUserId });
  } catch (error) {
    console.error('Error in Firebase session exchange:', error);
    return c.json({
      error: 'Failed to create session',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Initialize user data on first login
app.post('/api/users/initialize', firebaseAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }
  const userId = user.google_user_data?.sub;

  // Check if user already exists
  const existingUser = await c.env.DB.prepare(`
    SELECT id FROM users WHERE google_user_id = ?
  `).bind(userId).first();

  if (!existingUser) {
    // Create user record
    await c.env.DB.prepare(`
      INSERT INTO users (email, name, google_user_id) 
      VALUES (?, ?, ?)
    `).bind(user.email || '', user.google_user_data?.name || '', userId).run();

    // Create some default strategies
    const defaultStrategies = [
      {
        name: 'Momentum Breakout',
        description: 'Trade breakouts from consolidation patterns with high volume confirmation',
        category: 'Momentum',
        rules: 'Entry: Break above resistance with volume > 2x average. Exit: 2:1 R/R or trailing stop.',
        risk_per_trade: 2.0,
        target_rr: 2.0,
        timeframe: '15 minutes'
      },
      {
        name: 'Mean Reversion',
        description: 'Counter-trend strategy for oversold/overbought conditions',
        category: 'Mean Reversion',
        rules: 'Entry: RSI < 30 or > 70 with divergence. Exit: Return to mean or 1.5:1 R/R.',
        risk_per_trade: 1.5,
        target_rr: 1.5,
        timeframe: '1 hour'
      }
    ];

    for (const strategy of defaultStrategies) {
      await c.env.DB.prepare(`
        INSERT INTO strategies (user_id, name, description, category, rules, risk_per_trade, target_rr, timeframe, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).bind(
        userId,
        strategy.name,
        strategy.description,
        strategy.category,
        strategy.rules,
        strategy.risk_per_trade,
        strategy.target_rr,
        strategy.timeframe
      ).run();
    }
  }

  return c.json({ success: true });
});

// Export functionality
app.post('/api/export', firebaseAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }
  const options = await c.req.json();

  const data: { trades?: unknown[]; strategies?: unknown[] } = {};

  if (options.includeTrades) {
    let query = `
      SELECT t.*, s.name as strategy_name 
      FROM trades t
      LEFT JOIN strategies s ON t.strategy_id = s.id
      WHERE t.user_id = ?
    `;
    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const params = [userId];

    if (options.dateRange?.start) {
      query += ' AND t.entry_date >= ?';
      params.push(options.dateRange.start);
    }

    if (options.dateRange?.end) {
      query += ' AND t.entry_date <= ?';
      params.push(options.dateRange.end);
    }

    query += ' ORDER BY t.entry_date DESC';

    const trades = await c.env.DB.prepare(query).bind(...params).all();
    data.trades = trades.results;
  }

  if (options.includeStrategies) {
    const strategiesUserId = user.google_user_data?.sub || user.firebase_user_id;
    if (!strategiesUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const strategies = await c.env.DB.prepare(`
      SELECT * FROM strategies WHERE user_id = ?
    `).bind(strategiesUserId).all();
    data.strategies = strategies.results;
  }

  if (options.format === 'json') {
    return c.json(data);
  } else {
    // Convert to CSV
    let csv = '';

    if (data.trades) {
      csv += 'Trades\n';
      csv += 'Symbol,Asset Type,Direction,Quantity,Entry Price,Exit Price,Entry Date,Exit Date,P&L,Commission,Strategy,Notes,Tags\n';

      for (const trade of data.trades) {
        const tradeData = trade as {
          symbol?: string;
          asset_type?: string;
          direction?: string;
          quantity?: number;
          entry_price?: number;
          exit_price?: string | number;
          entry_date?: string;
          exit_date?: string;
          pnl?: number;
          commission?: number;
          strategy_name?: string;
          notes?: string;
          tags?: string;
        };
        csv += [
          tradeData.symbol || '',
          tradeData.asset_type || 'stocks',
          tradeData.direction || '',
          tradeData.quantity || '',
          tradeData.entry_price || '',
          tradeData.exit_price || '',
          tradeData.entry_date || '',
          tradeData.exit_date || '',
          tradeData.pnl || '',
          tradeData.commission || '',
          tradeData.strategy_name || '',
          `"${(tradeData.notes || '').replace(/"/g, '""')}"`,
          `"${(tradeData.tags || '').replace(/"/g, '""')}"`
        ].join(',') + '\n';
      }
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="tradecircle-export.csv"'
      }
    });
  }
});

// Route: User Sync (POST /api/auth/sync)
// Empfängt { uid, email } vom Frontend und legt User in D1 an
// Passt sich an das existierende Schema an: google_user_id statt id
// Enhanced with better error handling and retry-friendly responses
app.post("/api/auth/sync", async (c) => {
  try {
    console.log('[Auth Sync API] Received sync request');

    const body = await c.req.json<{ uid?: string; email?: string; name?: string }>();
    const { uid, email, name } = body;

    // Validate inputs
    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      console.error('[Auth Sync API] Invalid uid:', uid);
      return c.json({ error: "Invalid uid" }, 400);
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.error('[Auth Sync API] Invalid email:', email);
      return c.json({ error: "Invalid email" }, 400);
    }

    // Check if user already exists (avoid duplicate insert errors)
    try {
      const existingUser = await c.env.DB.prepare(
        'SELECT google_user_id FROM users WHERE google_user_id = ? LIMIT 1'
      ).bind(uid).first();

      if (existingUser) {
        console.log('[Auth Sync API] User already exists:', uid);

        // Set session cookie even for existing users
        setCookie(c, 'firebase_session', JSON.stringify({
          google_user_id: uid,
          email,
          name: name || '',
          sub: uid
        }), {
          httpOnly: true,
          path: '/',
          sameSite: 'none',
          secure: true,
          maxAge: 60 * 24 * 60 * 60, // 60 days
        });

        return c.json({ success: true, message: "User already synced", alreadyExists: true });
      }
    } catch (checkError) {
      console.warn('[Auth Sync API] Error checking existing user (non-critical):', checkError);
      // Continue to insert attempt even if check fails
    }

    // Try insert with settings column first (newer schema)
    try {
      const result = await c.env.DB.prepare(
        `INSERT INTO users (google_user_id, email, created_at, updated_at, settings)
         VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)`
      ).bind(uid, email, JSON.stringify({})).run();

      if (result.success) {
        console.log('[Auth Sync API] ✓ User synced successfully (with settings):', uid);

        // Set session cookie for new user
        setCookie(c, 'firebase_session', JSON.stringify({
          google_user_id: uid,
          email,
          name: name || '',
          sub: uid
        }), {
          httpOnly: true,
          path: '/',
          sameSite: 'none',
          secure: true,
          maxAge: 60 * 24 * 60 * 60, // 60 days
        });

        return c.json({ success: true, message: "User synced successfully" });
      }
    } catch (settingsError) {
      const errorMsg = settingsError instanceof Error ? settingsError.message : String(settingsError);

      // If settings column doesn't exist, try without it
      if (errorMsg?.includes("no such column: settings") || errorMsg?.includes("no such column name: settings") || errorMsg?.includes("has no column named settings")) {
        console.log('[Auth Sync API] Settings column not found, trying basic insert');

        try {
          const result = await c.env.DB.prepare(
            `INSERT INTO users (google_user_id, email, created_at, updated_at)
             VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          ).bind(uid, email).run();

          if (result.success) {
            console.log('[Auth Sync API] ✓ User synced successfully (basic):', uid);

            // Set session cookie for new user
            setCookie(c, 'firebase_session', JSON.stringify({
              google_user_id: uid,
              email,
              name: name || '',
              sub: uid
            }), {
              httpOnly: true,
              path: '/',
              sameSite: 'none',
              secure: true,
              maxAge: 60 * 24 * 60 * 60, // 60 days
            });

            return c.json({ success: true, message: "User synced successfully" });
          } else {
            console.error('[Auth Sync API] Basic insert failed:', result);
            return c.json({ error: "Failed to insert user", details: JSON.stringify(result) }, 500);
          }
        } catch (basicError) {
          console.error('[Auth Sync API] Basic insert error:', basicError);
          // Check if it's a unique constraint error (user already exists)
          const basicErrorMsg = basicError instanceof Error ? basicError.message : String(basicError);
          if (basicErrorMsg?.includes('UNIQUE constraint') || basicErrorMsg?.includes('unique')) {
            console.log('[Auth Sync API] User already exists (unique constraint):', uid);

            // Set session cookie even for existing users
            setCookie(c, 'firebase_session', JSON.stringify({
              google_user_id: uid,
              email,
              name: name || '',
              sub: uid
            }), {
              httpOnly: true,
              path: '/',
              sameSite: 'none',
              secure: true,
              maxAge: 60 * 24 * 60 * 60, // 60 days
            });

            return c.json({ success: true, message: "User already synced", alreadyExists: true });
          }
          throw basicError;
        }
      } else {
        // Some other error with settings insert
        console.error('[Auth Sync API] Settings insert error:', settingsError);
        throw settingsError;
      }
    }

    // Should not reach here, but just in case
    console.error('[Auth Sync API] Unexpected: reached end without return');
    return c.json({ error: "Unexpected error in sync flow" }, 500);

  } catch (error) {
    console.error("[Auth Sync API] ✗ Fatal error:", error);
    const errorDetails = error instanceof Error ? error.message : String(error);

    // Return 500 only for genuine server errors
    // The frontend will retry this with exponential backoff
    return c.json({
      error: "Database error during user sync",
      details: errorDetails,
      retryable: true // Signal to frontend that retry is appropriate
    }, 500);
  }
});

// Route: Jarvis Token (GET /api/hume/token)
// Holt ein Access-Token von der Hume API
app.get("/api/hume/token", async (c) => {
  const { HUME_API_KEY, HUME_SECRET_KEY } = c.env;

  if (!HUME_API_KEY || !HUME_SECRET_KEY) {
    return c.json(
      { error: "Missing Hume API credentials in environment bindings" },
      500,
    );
  }

  // Hinweis: Prüfe in der aktuellen Hume-Dokumentation, ob dies der korrekte Endpoint ist.
  const HUME_AUTH_URL = "https://api.hume.ai/v0/evi/configs";

  try {
    const basicAuth = btoa(`${HUME_API_KEY}:${HUME_SECRET_KEY}`);

    const response = await fetch(HUME_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "Hume API error response:",
        response.status,
        text.slice(0, 200),
      );
      return c.json(
        {
          error: "Hume API error",
          status: response.status,
        },
        502,
      );
    }

    const data: { accessToken?: string; token?: string; jwt?: string; access_token?: string } = await response.json() as { accessToken?: string; token?: string; jwt?: string; access_token?: string };
    const accessToken =
      data.accessToken ?? data.token ?? data.jwt ?? data.access_token ?? null;

    if (!accessToken) {
      console.error("Hume response missing access token field", data);
      return c.json(
        {
          error: "Hume response did not contain an access token",
        },
        502,
      );
    }

    return c.json({ accessToken });
  } catch (error) {
    console.error("Error calling Hume API:", error);
    return c.json(
      {
        error: "Failed to fetch token from Hume API",
      },
      502,
    );
  }
});

// Public whale transactions route (no auth required)
app.route('/api/whale-transactions', whaleTransactionsRouter);
app.route('/api/whale', debugWhaleRouter);
app.route('/api/crypto-news', cryptoNewsRouter);

// Protected API routes (auth is now handled inside each router)
app.route('/api/trades', tradesRouter);
app.route('/api/strategies', strategiesRouter);
app.route('/api/competition', competitionRouter);
app.route('/api/exchange-connections', exchangeConnectionsRouter);
app.route('/api/audio', audioRouter);
app.route('/api/sbt', sbtIssuerRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/keys', apiKeysRouter);
app.route('/api/reports', reportsRouter);
app.route('/api/trade-replay', tradeReplayRouter);
app.route('/api/voice-journal', voiceJournalRouter);
app.route('/api/ai-clone', aiCloneRouter);
app.route('/api/auto-trading', autoTradingRouter);
app.route('/api/subscriptions', subscriptionsRouter);
app.route('/api/discipline', discipline);
app.route('/api/2fa', twoFactorRouter);
app.route('/api/security', securityRouter);
app.route('/api/lighter', lighterRouter);

export default app;
