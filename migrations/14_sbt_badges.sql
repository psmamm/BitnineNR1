-- Migration 14: SBT Badges for On-Chain Resume
-- Stores SBT badge minting requests and status

CREATE TABLE IF NOT EXISTS sbt_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_address TEXT NOT NULL,  -- Ethereum/Polygon address
  achievement TEXT NOT NULL,   -- e.g., "6_months_profitable"
  max_drawdown INTEGER NOT NULL,  -- Basis points (10000 = 100%)
  profit_factor INTEGER NOT NULL,  -- Scaled (10000 = 1.00)
  r_multiple INTEGER NOT NULL,    -- Scaled (10000 = 1.00)
  status TEXT DEFAULT 'pending',   -- 'pending', 'minted', 'failed'
  transaction_hash TEXT,          -- Blockchain transaction hash
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  minted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(google_user_id)
);

CREATE INDEX IF NOT EXISTS idx_sbt_badges_user_id ON sbt_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_sbt_badges_user_address ON sbt_badges(user_address);
CREATE INDEX IF NOT EXISTS idx_sbt_badges_status ON sbt_badges(status);
