/**
 * Database initialization script
 * Creates essential tables for local development
 */

import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

// Create database directory
const dbDir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
mkdirSync(dbDir, { recursive: true })

const dbPath = path.join(dbDir, '01990f45-1b59-711a-a742-26cd7a0e0415.sqlite')
const db = new Database(dbPath)

console.log('🗄️  Initializing database:', dbPath)

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON')

// Users table
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  google_user_id TEXT UNIQUE,
  subscription_plan TEXT DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'active',
  settings TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`)

// Strategies table
db.exec(`
CREATE TABLE IF NOT EXISTS strategies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  rules TEXT,
  risk_per_trade REAL,
  target_rr REAL,
  timeframe TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`)

// Trades table
db.exec(`
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  strategy_id INTEGER,
  symbol TEXT NOT NULL,
  asset_type TEXT DEFAULT 'crypto',
  direction TEXT NOT NULL,
  quantity REAL NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL,
  entry_date DATE NOT NULL,
  exit_date DATE,
  pnl REAL,
  commission REAL DEFAULT 0,
  notes TEXT,
  tags TEXT,
  is_closed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id)
)
`)

// Exchange connections table (with encrypted columns)
db.exec(`
CREATE TABLE IF NOT EXISTS exchange_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  exchange_id TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  passphrase_encrypted TEXT,
  auto_sync_enabled BOOLEAN DEFAULT 0,
  sync_interval_hours INTEGER DEFAULT 24,
  last_sync_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`)

// Create indexes
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)',
  'CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date)',
  'CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_exchange_connections_user_id ON exchange_connections(user_id)'
]

indexes.forEach(sql => db.exec(sql))

console.log('✅ Database initialized successfully!')
console.log('📊 Tables created:')
console.log('   - users')
console.log('   - strategies')
console.log('   - trades')
console.log('   - exchange_connections')

db.close()
