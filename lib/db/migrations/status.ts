#!/usr/bin/env tsx
/**
 * Migration status script
 * Usage: npm run db:status
 *
 * Shows the current migration status of the database
 */

import Database from 'better-sqlite3'
import path from 'path'
import { getMigrationStatus } from './index'
import { migrations } from './all'

// Connect to database
const dbPath = path.join(process.cwd(), 'riskshield.db')
console.log(`Database: ${dbPath}\n`)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

try {
  const status = getMigrationStatus(db, migrations)

  console.log('=== Migration Status ===\n')

  if (status.current_version === null) {
    console.log('Current version: None (no migrations applied)')
  } else {
    console.log(`Current version: ${status.current_version}`)
  }

  console.log(`\nTotal migrations: ${migrations.length}`)
  console.log(`Applied: ${status.applied.length}`)
  console.log(`Pending: ${status.pending.length}`)

  if (status.applied.length > 0) {
    console.log('\n--- Applied Migrations ---')
    for (const m of status.applied) {
      console.log(`  [${m.version}] ${m.name} (applied: ${m.applied_at})`)
    }
  }

  if (status.pending.length > 0) {
    console.log('\n--- Pending Migrations ---')
    for (const m of status.pending) {
      console.log(`  [${m.version}] ${m.name}`)
    }
    console.log('\nRun "npm run db:migrate" to apply pending migrations.')
  } else {
    console.log('\nDatabase is up to date!')
  }
} catch (error) {
  console.error('Failed to get migration status:', error)
  process.exit(1)
} finally {
  db.close()
}
