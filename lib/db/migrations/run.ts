#!/usr/bin/env tsx
/**
 * Migration runner script
 * Usage: npm run db:migrate
 *
 * Options:
 *   --rollback  Rollback the last applied migration
 */

import Database from 'better-sqlite3'
import path from 'path'
import { runMigrations, rollbackMigration } from './index'
import { migrations } from './all'

const args = process.argv.slice(2)
const shouldRollback = args.includes('--rollback')

// Connect to database
const dbPath = path.join(process.cwd(), 'riskshield.db')
console.log(`Connecting to database: ${dbPath}`)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

try {
  if (shouldRollback) {
    console.log('\nRolling back last migration...')
    rollbackMigration(db, migrations)
  } else {
    console.log('\nRunning pending migrations...')
    const applied = runMigrations(db, migrations)

    if (applied === 0) {
      console.log('No pending migrations.')
    } else {
      console.log(`\nApplied ${applied} migration(s).`)
    }
  }
} catch (error) {
  console.error('Migration failed:', error)
  process.exit(1)
} finally {
  db.close()
}

console.log('Done.')
