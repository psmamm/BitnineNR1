/**
 * Development server for running the Cloudflare Worker locally with Node.js
 * This bypasses wrangler which has stability issues on Windows
 */

import { serve } from '@hono/node-server'
import { readFile } from 'node:fs/promises'
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read environment variables from .dev.vars
const devVars = await readFile('.dev.vars', 'utf-8')
const envVars = {}
devVars.split('\n').forEach(line => {
  line = line.trim()
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

// Set environment variables
Object.assign(process.env, envVars)

// Mock Cloudflare bindings for local development
const mockEnv = {
  // D1 Database mock (using better-sqlite3)
  DB: (() => {
    try {
      const db = new Database('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/01990f45-1b59-711a-a742-26cd7a0e0415.sqlite')

      return {
        prepare: (sql) => {
          const stmt = db.prepare(sql)
          return {
            bind: (...params) => {
              return {
                first: () => {
                  try {
                    return stmt.get(...params)
                  } catch (error) {
                    console.error('[DB Query Error]', error.message)
                    throw error
                  }
                },
                all: () => {
                  try {
                    const results = stmt.all(...params)
                    return { results, success: true }
                  } catch (error) {
                    console.error('[DB Query Error]', error.message)
                    throw error
                  }
                },
                run: () => {
                  try {
                    const result = stmt.run(...params)
                    return {
                      success: true,
                      meta: {
                        last_row_id: result.lastInsertRowid,
                        changes: result.changes
                      }
                    }
                  } catch (error) {
                    console.error('[DB Query Error]', error.message)
                    throw error
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('[DB] Failed to open database:', error.message)
      console.warn('[DB] Database queries will fail. Run migrations first.')
      return null
    }
  })(),

  // R2 Bucket mock (in-memory for dev)
  R2_BUCKET: {
    put: async (key, value) => {
      console.log(`[R2] PUT ${key}`)
      return { key }
    },
    get: async (key) => {
      console.log(`[R2] GET ${key}`)
      return null
    },
    delete: async (key) => {
      console.log(`[R2] DELETE ${key}`)
    }
  },

  // AI binding (not supported locally)
  AI: {
    run: async () => {
      console.warn('[AI] AI binding not supported in local development')
      return null
    }
  },

  // Environment variables
  ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY,
  HUME_API_KEY: process.env.HUME_API_KEY,
  HUME_SECRET_KEY: process.env.HUME_SECRET_KEY,
  POLYGON_RPC_URL: process.env.POLYGON_RPC_URL,
  SBT_CONTRACT_ADDRESS: process.env.SBT_CONTRACT_ADDRESS,
  ISSUER_PRIVATE_KEY: process.env.ISSUER_PRIVATE_KEY,
}

// Import the worker
const workerModule = await import('./src/worker/index.ts')
const app = workerModule.default

const port = 8787
console.log(`🚀 Worker dev server starting on http://localhost:${port}`)
console.log(`📁 Database: ${mockEnv.DB ? 'Connected' : 'Not connected (run migrations)'}`)
console.log(`🔐 Encryption key: ${mockEnv.ENCRYPTION_MASTER_KEY ? 'Set' : 'Not set'}`)
console.log('')

// Wrap fetch to inject environment properly
const wrappedFetch = async (request, env, ctx) => {
  // The @hono/node-server doesn't pass env correctly, so we inject it here
  return app.fetch(request, mockEnv, ctx)
}

serve({
  fetch: wrappedFetch,
  port
})

console.log(`✅ Worker dev server running on http://localhost:${port}`)
