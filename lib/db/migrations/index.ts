import Database from 'better-sqlite3'

export interface Migration {
  version: number
  name: string
  up: (db: Database.Database) => void
  down: (db: Database.Database) => void
}

/**
 * Run all pending migrations in order
 * @param db - Database instance
 * @param migrations - Array of migration objects
 * @returns Number of migrations applied
 */
export function runMigrations(db: Database.Database, migrations: Migration[]): number {
  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Get applied migrations
  const applied = db.prepare('SELECT version FROM _migrations ORDER BY version').all() as { version: number }[]
  const appliedVersions = new Set(applied.map(m => m.version))

  // Run pending migrations in order
  const pending = migrations
    .filter(m => !appliedVersions.has(m.version))
    .sort((a, b) => a.version - b.version)

  for (const migration of pending) {
    console.log(`Running migration ${migration.version}: ${migration.name}`)

    const transaction = db.transaction(() => {
      migration.up(db)
      db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name)
    })

    try {
      transaction()
      console.log(`Migration ${migration.version} completed`)
    } catch (error) {
      console.error(`Migration ${migration.version} failed:`, error)
      throw error
    }
  }

  return pending.length
}

/**
 * Rollback the most recent migration
 * @param db - Database instance
 * @param migrations - Array of migration objects
 */
export function rollbackMigration(db: Database.Database, migrations: Migration[]): void {
  const lastApplied = db.prepare('SELECT version FROM _migrations ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined

  if (!lastApplied) {
    console.log('No migrations to rollback')
    return
  }

  const migration = migrations.find(m => m.version === lastApplied.version)
  if (!migration) {
    throw new Error(`Migration ${lastApplied.version} not found in migrations list`)
  }

  console.log(`Rolling back migration ${migration.version}: ${migration.name}`)

  const transaction = db.transaction(() => {
    migration.down(db)
    db.prepare('DELETE FROM _migrations WHERE version = ?').run(migration.version)
  })

  transaction()
  console.log(`Rollback of migration ${migration.version} completed`)
}

/**
 * Get the current migration status
 * @param db - Database instance
 * @param migrations - Array of migration objects
 * @returns Object with applied and pending migrations
 */
export function getMigrationStatus(db: Database.Database, migrations: Migration[]): {
  applied: { version: number; name: string; applied_at: string }[]
  pending: { version: number; name: string }[]
  current_version: number | null
} {
  // Check if migrations table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'
  `).get()

  if (!tableExists) {
    return {
      applied: [],
      pending: migrations.map(m => ({ version: m.version, name: m.name })),
      current_version: null
    }
  }

  const applied = db.prepare(`
    SELECT version, name, applied_at FROM _migrations ORDER BY version
  `).all() as { version: number; name: string; applied_at: string }[]

  const appliedVersions = new Set(applied.map(m => m.version))

  const pending = migrations
    .filter(m => !appliedVersions.has(m.version))
    .sort((a, b) => a.version - b.version)
    .map(m => ({ version: m.version, name: m.name }))

  const lastApplied = applied.length > 0 ? applied[applied.length - 1].version : null

  return {
    applied,
    pending,
    current_version: lastApplied
  }
}

/**
 * Check if the database needs migrations
 * @param db - Database instance
 * @param migrations - Array of migration objects
 * @returns true if there are pending migrations
 */
export function hasPendingMigrations(db: Database.Database, migrations: Migration[]): boolean {
  const status = getMigrationStatus(db, migrations)
  return status.pending.length > 0
}
