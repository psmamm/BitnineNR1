-- AI Signal Generation (Day 6)
-- Creates table for storing AI-generated trading signals

-- AI Clone Signals Table
CREATE TABLE IF NOT EXISTS ai_clone_signals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('long', 'short')),
    signal_type TEXT NOT NULL DEFAULT 'entry' CHECK (signal_type IN ('entry', 'exit', 'alert')),
    confidence REAL NOT NULL DEFAULT 0,
    entry_price REAL,
    stop_loss REAL,
    take_profit REAL,
    risk_reward REAL,
    pattern_id TEXT,
    reasoning TEXT, -- JSON array
    market_context TEXT, -- JSON object
    expires_at TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'expired', 'cancelled')),
    triggered_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_signals_user_status ON ai_clone_signals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_signals_user_symbol ON ai_clone_signals(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_ai_signals_created ON ai_clone_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_signals_expires ON ai_clone_signals(expires_at);
