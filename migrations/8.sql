-- Exchange Connections table
CREATE TABLE exchange_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  exchange_id TEXT NOT NULL, -- 'binance', 'bybit', etc.
  exchange_name TEXT,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  passphrase TEXT,
  auto_sync_enabled BOOLEAN DEFAULT 0,
  sync_interval_hours INTEGER DEFAULT 24,
  last_sync_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exchange_connections_user_id ON exchange_connections(user_id);
