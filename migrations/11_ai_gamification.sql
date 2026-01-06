-- Migration 11: AI Journaling, Voice Notes, and Gamification Features
-- Extends existing schema for TradeCircle's killer features

-- ============================================================================
-- USERS TABLE EXTENSIONS (Gamification)
-- ============================================================================
-- Note: users.id remains INTEGER PRIMARY KEY AUTOINCREMENT for compatibility
-- Firebase UID is stored in google_user_id (already exists)
-- 
-- IMPORTANT: If columns already exist, these statements will fail.
-- Wrap in try-catch in application code or check schema before running.

-- Add username (unique identifier for gamification)
ALTER TABLE users ADD COLUMN username TEXT;

-- Add unique constraint on username (separate statement for SQLite compatibility)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username) WHERE username IS NOT NULL;

-- Add XP and leveling system
ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;

-- Add rank tier (ELO system integration)
ALTER TABLE users ADD COLUMN rank_tier TEXT DEFAULT 'BRONZE';

-- Add reputation score
ALTER TABLE users ADD COLUMN reputation_score INTEGER DEFAULT 100;

-- Add bio metrics flag for Apple Watch integration
ALTER TABLE users ADD COLUMN bio_metrics_enabled INTEGER DEFAULT 0;

-- ============================================================================
-- TRADES TABLE EXTENSIONS (AI Journaling & Voice Notes)
-- ============================================================================
-- Note: trades.id remains INTEGER PRIMARY KEY AUTOINCREMENT for compatibility
-- Consider adding a uuid TEXT column if UUIDs are needed for external references

-- Add UUID column for external references (optional, can be generated in application)
ALTER TABLE trades ADD COLUMN uuid TEXT;

-- Add unique constraint on uuid
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_uuid_unique ON trades(uuid) WHERE uuid IS NOT NULL;

-- Update entry_date and exit_date to support Unix timestamps
-- Note: Existing DATE columns remain, but we'll add INTEGER timestamp columns
ALTER TABLE trades ADD COLUMN entry_timestamp INTEGER;
ALTER TABLE trades ADD COLUMN exit_timestamp INTEGER;

-- Add size column (if not exists, some systems use quantity)
-- Note: quantity already exists, size might be different (e.g., position size in USD)
ALTER TABLE trades ADD COLUMN size REAL;

-- Add pnl_percent for percentage-based P&L tracking
ALTER TABLE trades ADD COLUMN pnl_percent REAL;

-- Rename pnl to pnl_net for clarity (or add as new column)
-- Note: Keeping pnl for backward compatibility, adding pnl_net
ALTER TABLE trades ADD COLUMN pnl_net REAL;

-- AI Journaling Fields
ALTER TABLE trades ADD COLUMN voice_note_url TEXT;
ALTER TABLE trades ADD COLUMN voice_transcription TEXT;
ALTER TABLE trades ADD COLUMN emotion_tag TEXT;
ALTER TABLE trades ADD COLUMN ai_analysis TEXT; -- JSON string for AI mentor feedback
ALTER TABLE trades ADD COLUMN screenshot_url TEXT;
ALTER TABLE trades ADD COLUMN playbook_validation INTEGER DEFAULT 0; -- 0 = not validated, 1 = passed, -1 = failed

-- ============================================================================
-- STRATEGIES TABLE EXTENSIONS (Playbooks with JSON Rules)
-- ============================================================================
-- Add rules_json for Strategy DNA Audit
ALTER TABLE strategies ADD COLUMN rules_json TEXT; -- JSON object with strategy rules

-- ============================================================================
-- ACHIEVEMENTS TABLE (Gamification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'STREAK_7_DAYS', 'NO_LOSS_DAY', 'PERFECT_WEEK', etc.
  title TEXT,
  description TEXT,
  icon_url TEXT,
  awarded_at INTEGER NOT NULL, -- Unix timestamp
  metadata TEXT, -- JSON string for additional achievement data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(google_user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for fast dashboard queries (user trades sorted by date)
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_date ON trades(user_id, entry_timestamp);

-- Index for entry_date (backward compatibility)
CREATE INDEX IF NOT EXISTS idx_trades_entry_date_compat ON trades(entry_date);

-- Index for achievements lookups
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_awarded_at ON achievements(awarded_at);

-- Index for username lookups (gamification leaderboards)
-- Note: idx_users_username_unique already created above
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp);
CREATE INDEX IF NOT EXISTS idx_users_rank_tier ON users(rank_tier);

-- Index for trades UUID lookups
CREATE INDEX IF NOT EXISTS idx_trades_uuid ON trades(uuid);

-- Index for AI analysis queries
CREATE INDEX IF NOT EXISTS idx_trades_emotion_tag ON trades(emotion_tag);
CREATE INDEX IF NOT EXISTS idx_trades_playbook_validation ON trades(playbook_validation);

-- ============================================================================
-- DATA MIGRATION HELPERS (Optional - run these in application code)
-- ============================================================================
-- Migrate existing entry_date to entry_timestamp:
-- UPDATE trades SET entry_timestamp = CAST((julianday(entry_date) - 2440587.5) * 86400000 AS INTEGER) WHERE entry_timestamp IS NULL;

-- Migrate existing exit_date to exit_timestamp:
-- UPDATE trades SET exit_timestamp = CAST((julianday(exit_date) - 2440587.5) * 86400000 AS INTEGER) WHERE exit_date IS NOT NULL AND exit_timestamp IS NULL;

-- Set pnl_net from pnl:
-- UPDATE trades SET pnl_net = pnl WHERE pnl_net IS NULL AND pnl IS NOT NULL;

