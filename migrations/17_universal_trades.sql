-- Migration 17: Universal Trades Schema
-- Adds multi-asset support for Crypto, Stocks, Forex, Futures, and Options

-- ============================================================================
-- Add new columns to existing trades table
-- ============================================================================

-- Asset classification
ALTER TABLE trades ADD COLUMN asset_class TEXT DEFAULT 'crypto';

-- Instrument details
ALTER TABLE trades ADD COLUMN base_asset TEXT;
ALTER TABLE trades ADD COLUMN quote_asset TEXT;

-- Trade details
ALTER TABLE trades ADD COLUMN side TEXT; -- Will replace 'direction'
ALTER TABLE trades ADD COLUMN leverage REAL DEFAULT 1;

-- Options-specific fields
ALTER TABLE trades ADD COLUMN option_type TEXT; -- 'call' or 'put'
ALTER TABLE trades ADD COLUMN strike_price REAL;
ALTER TABLE trades ADD COLUMN expiration_date TEXT;

-- Source information
ALTER TABLE trades ADD COLUMN exchange TEXT;
ALTER TABLE trades ADD COLUMN broker TEXT;
ALTER TABLE trades ADD COLUMN import_source TEXT DEFAULT 'manual'; -- 'api', 'csv', 'manual', 'wallet'
ALTER TABLE trades ADD COLUMN external_id TEXT; -- External trade ID from exchange

-- Enhanced P&L
ALTER TABLE trades ADD COLUMN realized_pnl REAL;
ALTER TABLE trades ADD COLUMN unrealized_pnl REAL;

-- Journal enhancements
ALTER TABLE trades ADD COLUMN setup_type TEXT;
ALTER TABLE trades ADD COLUMN screenshots TEXT; -- JSON array of URLs
ALTER TABLE trades ADD COLUMN voice_notes TEXT; -- JSON array of voice note IDs
ALTER TABLE trades ADD COLUMN emotion_data TEXT; -- JSON emotion analysis

-- Timestamps
ALTER TABLE trades ADD COLUMN entry_time TEXT; -- ISO timestamp for precise timing
ALTER TABLE trades ADD COLUMN exit_time TEXT;

-- ============================================================================
-- Create indexes for new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trades_asset_class ON trades(asset_class);
CREATE INDEX IF NOT EXISTS idx_trades_exchange ON trades(exchange);
CREATE INDEX IF NOT EXISTS idx_trades_external_id ON trades(external_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_trades_import_source ON trades(import_source);

-- ============================================================================
-- Voice Journal Entries Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_journal (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id INTEGER,

  -- Audio data
  audio_url TEXT NOT NULL,
  transcript TEXT,
  duration_seconds INTEGER,

  -- Emotion Analysis (Hume AI)
  emotion_data TEXT, -- JSON
  primary_emotion TEXT,
  sentiment REAL,
  stress_level REAL,

  -- AI Extracted insights
  extracted_insights TEXT, -- JSON

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (trade_id) REFERENCES trades(id)
);

CREATE INDEX IF NOT EXISTS idx_voice_journal_user_id ON voice_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_journal_trade_id ON voice_journal(trade_id);

-- ============================================================================
-- Trade Replay Data Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS trade_replays (
  id TEXT PRIMARY KEY,
  trade_id INTEGER NOT NULL,

  -- Market Data (stored in R2, reference here)
  tick_data_url TEXT,
  timeframes_data TEXT, -- JSON (multi-TF references)

  -- Annotations
  drawings TEXT, -- JSON
  notes TEXT, -- JSON
  screenshots TEXT, -- JSON array of URLs

  -- AI Analysis
  ai_annotations TEXT, -- JSON
  what_if_scenarios TEXT, -- JSON

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (trade_id) REFERENCES trades(id)
);

CREATE INDEX IF NOT EXISTS idx_trade_replays_trade_id ON trade_replays(trade_id);

-- ============================================================================
-- Journal Templates Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- NULL = system template

  name TEXT NOT NULL,
  category TEXT NOT NULL,
  template_data TEXT NOT NULL, -- JSON

  is_public INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_templates_user_id ON journal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_templates_category ON journal_templates(category);
CREATE INDEX IF NOT EXISTS idx_journal_templates_is_public ON journal_templates(is_public);

-- ============================================================================
-- Broker/Exchange Connections Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS broker_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  exchange_id TEXT NOT NULL,
  exchange_name TEXT NOT NULL,

  -- Encrypted Credentials (stored encrypted in D1)
  encrypted_api_key TEXT,
  encrypted_api_secret TEXT,
  encrypted_passphrase TEXT,

  -- OAuth (for some brokers)
  oauth_token TEXT,
  oauth_refresh TEXT,
  oauth_expires TEXT,

  -- Connection settings
  is_testnet INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,

  -- Sync status
  last_sync TEXT,
  sync_error TEXT,
  trades_synced INTEGER DEFAULT 0,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id ON broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_exchange_id ON broker_connections(exchange_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_is_active ON broker_connections(is_active);

-- ============================================================================
-- AI Clone Pattern Learning Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS trade_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Pattern Data
  symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  timeframe TEXT,
  setup_type TEXT,

  -- Features (ML Input)
  features_json TEXT NOT NULL,

  -- Outcome
  outcome TEXT NOT NULL, -- 'win', 'loss', 'breakeven'
  pnl_percent REAL,

  -- Confidence
  confidence REAL,
  sample_size INTEGER DEFAULT 1,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_trade_patterns_user_id ON trade_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_patterns_symbol ON trade_patterns(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_patterns_asset_class ON trade_patterns(asset_class);
CREATE INDEX IF NOT EXISTS idx_trade_patterns_setup_type ON trade_patterns(setup_type);

-- ============================================================================
-- AI Clone Config Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_clone_config (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,

  -- Permission Level
  permission_level TEXT DEFAULT 'observe', -- 'observe', 'suggest', 'semi_auto', 'full_auto'

  -- Risk Limits
  max_position_size REAL,
  max_daily_trades INTEGER,
  max_daily_loss REAL,
  min_confidence REAL DEFAULT 0.7,

  -- Allowed Assets
  allowed_asset_classes TEXT, -- JSON array
  allowed_symbols TEXT, -- JSON array
  allowed_exchanges TEXT, -- JSON array

  -- Trading Hours
  allowed_hours TEXT, -- JSON (e.g., {"start": "09:00", "end": "16:00", "timezone": "America/New_York"})

  -- Status
  is_active INTEGER DEFAULT 0,
  last_trade TEXT,
  total_trades INTEGER DEFAULT 0,
  total_pnl REAL DEFAULT 0,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- AI Clone Decisions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_clone_decisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pattern_id TEXT,

  -- Decision
  decision_type TEXT NOT NULL, -- 'suggest', 'execute'
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'long', 'short'
  entry_price REAL,
  stop_loss REAL,
  take_profit REAL,
  position_size REAL,

  -- Confidence
  confidence REAL NOT NULL,
  reasoning TEXT,

  -- Outcome
  was_approved INTEGER, -- NULL = pending, 1 = approved, 0 = rejected
  was_executed INTEGER DEFAULT 0,
  execution_trade_id INTEGER,
  execution_time TEXT,

  -- Result
  result_pnl REAL,
  result_outcome TEXT, -- 'win', 'loss', 'breakeven', 'stopped'

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (pattern_id) REFERENCES trade_patterns(id),
  FOREIGN KEY (execution_trade_id) REFERENCES trades(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_clone_decisions_user_id ON ai_clone_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_clone_decisions_decision_type ON ai_clone_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_ai_clone_decisions_was_executed ON ai_clone_decisions(was_executed);

-- ============================================================================
-- Subscriptions Table (Freemium)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,

  -- Tier
  tier TEXT DEFAULT 'free', -- 'free', 'pro', 'elite'

  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Usage
  trades_this_month INTEGER DEFAULT 0,
  voice_minutes_used INTEGER DEFAULT 0,
  storage_used_mb REAL DEFAULT 0,

  -- Features (for granular control)
  features TEXT, -- JSON array of enabled features

  -- Billing dates
  current_period_start TEXT,
  current_period_end TEXT,
  cancelled_at TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- ============================================================================
-- Insert default system templates
-- ============================================================================

INSERT INTO journal_templates (id, user_id, name, category, template_data, is_public) VALUES
  ('tpl_trade_plan', NULL, 'Trade Plan Template', 'pre-trade',
   '{"fields": ["market_analysis", "entry_criteria", "exit_criteria", "risk_assessment", "position_size", "notes"]}', 1),

  ('tpl_trade_review_basic', NULL, 'Trade Review (Basic)', 'post-trade',
   '{"fields": ["what_went_well", "what_could_improve", "lessons_learned", "rating"]}', 1),

  ('tpl_trade_review_detailed', NULL, 'Trade Review (Detailed)', 'post-trade',
   '{"fields": ["market_context", "entry_analysis", "trade_management", "exit_analysis", "emotional_state", "rule_adherence", "lessons_learned", "action_items"]}', 1),

  ('tpl_daily_mindset', NULL, 'Daily Mindset Check', 'psychology',
   '{"fields": ["current_mood", "energy_level", "focus_level", "market_bias", "goals_for_today", "potential_challenges"]}', 1),

  ('tpl_weekly_review', NULL, 'Weekly Review', 'psychology',
   '{"fields": ["wins_this_week", "losses_this_week", "biggest_lesson", "emotional_patterns", "goals_for_next_week"]}', 1);
