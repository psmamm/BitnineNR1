import { Hono } from "hono";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { tradesRouter } from "./routes/trades";
import { strategiesRouter } from "./routes/strategies";
import { whaleTransactionsRouter } from "./routes/whale-transactions";
import { debugWhaleRouter } from "./routes/debug-whale";
import { cryptoNewsRouter } from "./routes/crypto-news";
import { competitionRouter } from "./routes/competition";
import { exchangeConnectionsRouter } from "./routes/exchange-connections";
import type { D1Database } from "@cloudflare/workers-types";



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



type Env = {
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  ETHERSCAN_API_KEY: string;
  BSCSCAN_API_KEY: string;
  SNOWTRACE_API_KEY: string;
  ARBISCAN_API_KEY: string;
  OPTIMISM_API_KEY: string;
  TRON_API_KEY: string;
  SOLSCAN_API_KEY: string;
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

// Obtain redirect URL from the Authentication Service
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

// Exchange the code for a session token
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

// Get the current user object for the frontend
app.get("/api/users/me", combinedAuthMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  // Get userId - support both Mocha and Firebase auth
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

  // Fetch user data from database including avatar_icon
  try {
    const dbUser = await c.env.DB.prepare(`
      SELECT name, avatar_icon, email FROM users 
      WHERE google_user_id = ?
    `).bind(userId).first();

    return c.json({
      ...user,
      displayName: dbUser?.name || user.google_user_data?.name || user.email?.split('@')[0],
      avatarIcon: dbUser?.avatar_icon || null
    });
  } catch (error) {
    // If query fails, return user without database data
    return c.json({
      ...user,
      displayName: user.google_user_data?.name || user.email?.split('@')[0],
      avatarIcon: null
    });
  }
});

// Call this from the frontend to log out the user
app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Update user profile
app.put('/api/users/profile', combinedAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const { displayName, avatarIcon } = body;
  // Get userId - support both Mocha and Firebase auth
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
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
    } catch (alterError: any) {
      // Column might already exist, which is fine
      if (alterError.message?.includes('duplicate column name') || alterError.message?.includes('duplicate')) {
        console.log('avatar_icon column already exists');
      } else {
        console.log('Note: avatar_icon column may already exist:', alterError.message);
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
    } catch (updateError: any) {
      console.error('Update error:', updateError);
      // If avatar_icon update fails, try without it
      if (updateError.message?.includes('no such column: avatar_icon')) {
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
  } catch (error: any) {
    console.error('Profile update error:', error);
    return c.json({ error: error.message || 'Failed to update profile' }, 500);
  }
});

// Get user starting capital
app.get('/api/users/starting-capital', combinedAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 400);
  }

  try {
    // Try to add starting_capital column if it doesn't exist
    try {
      await c.env.DB.prepare(`ALTER TABLE users ADD COLUMN starting_capital REAL DEFAULT 10000`).run();
    } catch (alterError: any) {
      // Column might already exist, which is fine
      if (!alterError.message?.includes('duplicate column name') && !alterError.message?.includes('duplicate')) {
        console.log('Note: starting_capital column may already exist:', alterError.message);
      }
    }

    const dbUser = await c.env.DB.prepare(`
      SELECT starting_capital FROM users WHERE google_user_id = ?
    `).bind(userId).first();

    const startingCapital = dbUser?.starting_capital || 10000;

    return c.json({ success: true, startingCapital });
  } catch (error: any) {
    console.error('Failed to get starting capital:', error);
    return c.json({ success: true, startingCapital: 10000 }); // Return default on error
  }
});

// Update user starting capital
app.put('/api/users/starting-capital', combinedAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const { startingCapital } = await c.req.json();
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

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
    } catch (alterError: any) {
      // Column might already exist, which is fine
      if (!alterError.message?.includes('duplicate column name') && !alterError.message?.includes('duplicate')) {
        console.log('Note: starting_capital column may already exist:', alterError.message);
      }
    }

    // Check if user exists
    let userRecord = await c.env.DB.prepare(`
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
  } catch (error: any) {
    console.error('Failed to update starting capital:', error);
    return c.json({ error: error.message || 'Failed to update starting capital' }, 500);
  }
});

// Get user settings
app.get('/api/users/settings', combinedAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
  const settings = await c.env.DB.prepare(`
    SELECT notification_settings, theme_preference FROM users WHERE google_user_id = ?
  `).bind(userId).first();

  return c.json({
    notifications: settings?.notification_settings ? JSON.parse(settings.notification_settings as string) : {
      tradeAlerts: true,
      performanceReports: true,
      productUpdates: false
    },
    theme: settings?.theme_preference || 'dark'
  });
});

// Update user settings
app.put('/api/users/settings', combinedAuthMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  const { notifications, theme } = await c.req.json();
  const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

  const result = await c.env.DB.prepare(`
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
    let userRecord = await c.env.DB.prepare(`
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
      sameSite: 'lax',
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
app.post('/api/users/initialize', authMiddleware, async (c) => {
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
app.post('/api/export', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }
  const options = await c.req.json();

  let data: any = {};

  if (options.includeTrades) {
    let query = `
      SELECT t.*, s.name as strategy_name 
      FROM trades t
      LEFT JOIN strategies s ON t.strategy_id = s.id
      WHERE t.user_id = ?
    `;
    const params = [user.google_user_data?.sub];

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
    const strategies = await c.env.DB.prepare(`
      SELECT * FROM strategies WHERE user_id = ?
    `).bind(user.google_user_data?.sub).all();
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
        csv += [
          trade.symbol,
          trade.asset_type || 'stocks',
          trade.direction,
          trade.quantity,
          trade.entry_price,
          trade.exit_price || '',
          trade.entry_date,
          trade.exit_date || '',
          trade.pnl || '',
          trade.commission || '',
          trade.strategy_name || '',
          `"${(trade.notes || '').replace(/"/g, '""')}"`,
          `"${(trade.tags || '').replace(/"/g, '""')}"`
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

// Public whale transactions route (no auth required)
app.route('/api/whale-transactions', whaleTransactionsRouter);
app.route('/api/whale', debugWhaleRouter);
app.route('/api/crypto-news', cryptoNewsRouter);

// Protected API routes (auth is now handled inside each router)
app.route('/api/trades', tradesRouter);
app.route('/api/strategies', strategiesRouter);
app.route('/api/competition', competitionRouter);
app.route('/api/exchange-connections', exchangeConnectionsRouter);

export default app;
