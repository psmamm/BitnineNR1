-- Migration 27: Two-Factor Authentication
-- Adds 2FA support to the users table

-- Add 2FA columns to users table
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT; -- JSON array of hashed backup codes
ALTER TABLE users ADD COLUMN two_factor_enabled_at TEXT;

-- Create index for quick 2FA status checks
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);
