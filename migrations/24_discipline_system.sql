-- Discipline System Tables
-- Iron-Fist 3-Loss Lockout System
-- Tracks lockout events and admin actions for audit trail

-- Discipline Events Table
-- Records all lockout events triggered by the 3-loss rule
CREATE TABLE IF NOT EXISTS discipline_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,

  -- Event type: 'lockout_triggered', 'lockout_expired', 'force_unlocked'
  event_type TEXT NOT NULL,

  -- Comma-separated list of trade IDs that triggered this lockout
  trigger_trades TEXT,

  -- Unix timestamp when lockout ends
  lockout_until INTEGER,

  -- Unix timestamp when event was created
  created_at INTEGER NOT NULL,

  -- Unix timestamp when lockout was manually resolved (force unlock)
  resolved_at INTEGER,

  FOREIGN KEY (user_id) REFERENCES users(google_user_id) ON DELETE CASCADE
);

-- Indexes for discipline_events
CREATE INDEX IF NOT EXISTS idx_discipline_events_user_id ON discipline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_discipline_events_event_type ON discipline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_discipline_events_created_at ON discipline_events(created_at);

-- Admin Actions Table
-- Records all admin actions for audit trail
CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Partially masked admin key for identification (first 8 chars + ...)
  admin_key TEXT NOT NULL,

  -- Action type: 'force_unlock', 'config_change', etc.
  action_type TEXT NOT NULL,

  -- Target user ID (for user-specific actions)
  target_user_id TEXT,

  -- Reason for the action (required for audit)
  reason TEXT,

  -- Unix timestamp when action was performed
  created_at INTEGER NOT NULL
);

-- Indexes for admin_actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
