-- TradeCircle core schema

-- Tabelle users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,       -- Firebase UID
  email TEXT,
  created_at INTEGER,        -- UNIX-Timestamp (seconds since epoch)
  settings TEXT              -- JSON-String für User-Preferences
);

-- Tabelle api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  user_id TEXT NOT NULL,     -- Foreign Key zu users.id
  exchange TEXT NOT NULL,    -- z.B. "BYBIT"
  encrypted_key TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  iv TEXT NOT NULL,          -- Initialisierungsvektor für die Verschlüsselung
  FOREIGN KEY (user_id) REFERENCES users(id)
);

