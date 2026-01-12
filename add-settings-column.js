/**
 * Add settings column to users table
 */

import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/01990f45-1b59-711a-a742-26cd7a0e0415.sqlite'

try {
  const db = new Database(dbPath)

  console.log('🗄️  Adding settings column to users table...')

  // Try to add the settings column if it doesn't exist
  try {
    db.exec('ALTER TABLE users ADD COLUMN settings TEXT DEFAULT "{}"')
    console.log('✅ Settings column added successfully!')
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Settings column already exists!')
    } else {
      throw error
    }
  }

  db.close()
  console.log('✅ Database migration complete!')
} catch (error) {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
}
