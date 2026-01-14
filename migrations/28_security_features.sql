-- Migration 28: Security Features (Anti-Phishing Code & Device Management)

-- Add anti-phishing code column to users table
ALTER TABLE users ADD COLUMN anti_phishing_code TEXT;

-- Create devices table for device management
CREATE TABLE IF NOT EXISTS user_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser TEXT,
    os TEXT,
    ip_address TEXT,
    location TEXT,
    is_trusted INTEGER DEFAULT 0,
    last_active_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);

-- Create login_history table for account activity
CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    device_id TEXT,
    ip_address TEXT,
    location TEXT,
    status TEXT DEFAULT 'success', -- 'success', 'failed', 'blocked'
    failure_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);
