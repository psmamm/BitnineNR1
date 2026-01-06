
CREATE TABLE whale_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_hash TEXT NOT NULL UNIQUE,
  chain TEXT NOT NULL,
  coin_symbol TEXT NOT NULL,
  amount_tokens REAL NOT NULL,
  usd_value REAL NOT NULL,
  transfer_type TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  block_timestamp INTEGER NOT NULL,
  explorer_url TEXT NOT NULL,
  is_processed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whale_transactions_hash ON whale_transactions(transaction_hash);
CREATE INDEX idx_whale_transactions_timestamp ON whale_transactions(block_timestamp);
CREATE INDEX idx_whale_transactions_usd_value ON whale_transactions(usd_value);
CREATE INDEX idx_whale_transactions_chain ON whale_transactions(chain);
