-- Competition System Upgrade - ELO, Matches, Daily Challenge, Tournaments

-- ELO System für Spieler
CREATE TABLE player_elo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  elo INTEGER DEFAULT 500,
  division TEXT DEFAULT 'Bronze',
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  best_elo INTEGER DEFAULT 500,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Matches (Ranked & Practice)
CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_type TEXT NOT NULL, -- 'ranked' | 'practice'
  status TEXT DEFAULT 'pending', -- 'pending' | 'active' | 'completed' | 'cancelled'
  symbol TEXT DEFAULT 'BTCUSDT',
  time_limit INTEGER DEFAULT 300, -- seconds
  max_drawdown REAL DEFAULT 5000,
  player1_id TEXT NOT NULL,
  player2_id TEXT, -- NULL für practice
  player1_balance REAL DEFAULT 100000,
  player2_balance REAL DEFAULT 100000,
  player1_pnl REAL DEFAULT 0,
  player2_pnl REAL DEFAULT 0,
  player1_trades INTEGER DEFAULT 0,
  player2_trades INTEGER DEFAULT 0,
  player1_win_rate REAL DEFAULT 0,
  player2_win_rate REAL DEFAULT 0,
  player1_elo_change INTEGER DEFAULT 0,
  player2_elo_change INTEGER DEFAULT 0,
  winner_id TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Match Positions (für Trade Analytics)
CREATE TABLE match_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Long' | 'Short'
  leverage INTEGER DEFAULT 1,
  size REAL NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL,
  pnl REAL DEFAULT 0,
  commission REAL DEFAULT 0,
  is_win BOOLEAN,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- Daily Challenges
CREATE TABLE daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_date DATE NOT NULL UNIQUE,
  symbol TEXT DEFAULT 'BTCUSDT',
  time_limit INTEGER DEFAULT 86400, -- 24 hours in seconds
  status TEXT DEFAULT 'active', -- 'upcoming' | 'active' | 'completed'
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily Challenge Participants
CREATE TABLE daily_challenge_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  final_balance REAL DEFAULT 100000,
  pnl REAL DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0,
  rank INTEGER,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id),
  UNIQUE(challenge_id, user_id)
);

-- Tournaments
CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  time_limit INTEGER NOT NULL, -- minutes
  max_drawdown REAL, -- NULL = no limit
  max_participants INTEGER DEFAULT 1000,
  status TEXT DEFAULT 'pending', -- 'pending' | 'active' | 'ready' | 'completed'
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tournament Participants
CREATE TABLE tournament_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  final_balance REAL DEFAULT 100000,
  pnl REAL DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0,
  rank INTEGER,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  UNIQUE(tournament_id, user_id)
);

-- Tournament Chat Messages
CREATE TABLE tournament_chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

-- Friends System
CREATE TABLE friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'accepted' | 'blocked'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- Matchmaking Queue
CREATE TABLE matchmaking_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  elo INTEGER NOT NULL,
  match_type TEXT NOT NULL, -- 'ranked' | 'practice'
  symbol TEXT DEFAULT 'BTCUSDT',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes für Performance
CREATE INDEX idx_player_elo_user_id ON player_elo(user_id);
CREATE INDEX idx_player_elo_elo ON player_elo(elo);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_match_positions_match_id ON match_positions(match_id);
CREATE INDEX idx_daily_challenges_date ON daily_challenges(challenge_date);
CREATE INDEX idx_daily_challenge_participants_challenge_id ON daily_challenge_participants(challenge_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_matchmaking_queue_elo ON matchmaking_queue(elo);
CREATE INDEX idx_matchmaking_queue_match_type ON matchmaking_queue(match_type);
CREATE INDEX idx_tournament_chat_tournament_id ON tournament_chat(tournament_id);

