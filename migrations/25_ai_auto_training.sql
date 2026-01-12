-- AI Auto-Training Settings (Day 2 Enhancement)
-- Adds auto-training configuration to ai_clone_config table

-- Add auto-training columns to ai_clone_config
-- Note: SQLite doesn't support multiple ADD COLUMN in one statement

-- Auto-train enabled flag
ALTER TABLE ai_clone_config ADD COLUMN auto_train_enabled INTEGER DEFAULT 0;

-- Number of new trades before auto-training triggers
ALTER TABLE ai_clone_config ADD COLUMN auto_train_threshold INTEGER DEFAULT 20;

-- Track trades since last training for auto-trigger
ALTER TABLE ai_clone_config ADD COLUMN trades_since_training INTEGER DEFAULT 0;

-- Index for quick lookup of auto-train enabled configs
CREATE INDEX IF NOT EXISTS idx_ai_clone_config_auto_train ON ai_clone_config(auto_train_enabled);
