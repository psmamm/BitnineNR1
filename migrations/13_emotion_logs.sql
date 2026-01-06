-- Migration 13: Emotion Logs for Hume AI Integration
-- Stores emotion analysis data from Hume AI EVI correlated with trading positions

CREATE TABLE IF NOT EXISTS emotion_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  position_id TEXT NOT NULL,
  audio_url TEXT,
  emotions_json TEXT NOT NULL,  -- JSON array of emotion scores
  prosody_json TEXT NOT NULL,    -- JSON object with stress, hesitation, fear, overconfidence
  current_pnl REAL NOT NULL,
  position_size REAL NOT NULL,
  entry_price REAL NOT NULL,
  current_price REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(google_user_id)
);

CREATE INDEX IF NOT EXISTS idx_emotion_logs_user_id ON emotion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_position_id ON emotion_logs(position_id);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_timestamp ON emotion_logs(timestamp);
