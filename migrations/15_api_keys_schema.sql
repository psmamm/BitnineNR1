-- Migration 15: API Keys Table for Exchange Connections
-- Creates the api_keys table for storing encrypted exchange API credentials

-- Tabelle api_keys für verschlüsselte Exchange API Credentials
CREATE TABLE IF NOT EXISTS api_keys (
  user_id TEXT NOT NULL,              -- Foreign Key zu users.google_user_id (Firebase UID)
  exchange TEXT NOT NULL,              -- z.B. "BYBIT", "BINANCE", etc.
  encrypted_key TEXT NOT NULL,        -- Verschlüsselter API Key
  encrypted_secret TEXT NOT NULL,     -- Verschlüsseltes API Secret
  iv TEXT NOT NULL,                   -- Initialisierungsvektor für die Verschlüsselung
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, exchange),    -- Ein User kann pro Exchange nur einen Key haben
  FOREIGN KEY (user_id) REFERENCES users(google_user_id)
);

-- Index für schnelle Suche nach User API Keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_exchange ON api_keys(exchange);
