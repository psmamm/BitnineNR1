CREATE TABLE competition_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  final_balance REAL NOT NULL,
  pnl REAL NOT NULL,
  total_trades INTEGER DEFAULT 0,
  max_drawdown REAL DEFAULT 0,
  game_mode TEXT DEFAULT 'speed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competition_scores_user_id ON competition_scores(user_id);
CREATE INDEX idx_competition_scores_pnl ON competition_scores(pnl);
CREATE INDEX idx_competition_scores_created_at ON competition_scores(created_at);
