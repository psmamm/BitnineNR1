-- Migration 12: Risk Management Kill Switch
-- Adds risk management columns to users table for trading lockout functionality

-- Add lockout_until column (Unix timestamp when lockout ends, NULL = no lockout)
ALTER TABLE users ADD COLUMN lockout_until INTEGER;

-- Add risk_lock_enabled column (Boolean flag, 0 = disabled, 1 = enabled)
ALTER TABLE users ADD COLUMN risk_lock_enabled INTEGER DEFAULT 0;

-- Add max_daily_loss column (Maximum daily loss in USD, e.g. -500.00)
ALTER TABLE users ADD COLUMN max_daily_loss REAL;

-- Create index for lockout_until for faster queries
CREATE INDEX IF NOT EXISTS idx_users_lockout_until ON users(lockout_until) WHERE lockout_until IS NOT NULL;

