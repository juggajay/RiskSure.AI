/**
 * Migration: Procore Integration
 *
 * Adds support for Procore OAuth integration:
 * - Updates oauth_states and oauth_connections to support 'procore' provider
 * - Adds procore_company_id/procore_company_name to oauth_connections
 * - Creates procore_mappings table for entity sync tracking
 */

import type { Database } from 'better-sqlite3'

export const migration = {
  version: 5,
  name: '005_procore_integration',

  up: (db: Database) => {
    console.log('[Migration 005] Adding Procore integration support...')

    // SQLite doesn't support ALTER TABLE to modify CHECK constraints
    // So we need to recreate the tables with updated constraints

    // Step 1: Create new oauth_states table with updated constraint
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_states_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        company_id TEXT NOT NULL REFERENCES companies(id),
        provider TEXT NOT NULL CHECK(provider IN ('microsoft', 'google', 'procore')),
        state TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      )
    `)

    // Copy data from old table if it exists
    db.exec(`
      INSERT OR IGNORE INTO oauth_states_new (id, user_id, company_id, provider, state, created_at, expires_at)
      SELECT id, user_id, company_id, provider, state, created_at, expires_at
      FROM oauth_states
    `)

    // Drop old table and rename new one
    db.exec(`DROP TABLE IF EXISTS oauth_states`)
    db.exec(`ALTER TABLE oauth_states_new RENAME TO oauth_states`)

    // Step 2: Create new oauth_connections table with updated constraint and new columns
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_connections_new (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        provider TEXT NOT NULL CHECK(provider IN ('microsoft', 'google', 'procore')),
        email TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TEXT,
        last_sync_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        -- Procore-specific fields
        procore_company_id INTEGER,
        procore_company_name TEXT,
        -- Pending company selection (when user has multiple Procore companies)
        pending_company_selection INTEGER DEFAULT 0,
        UNIQUE(company_id, provider)
      )
    `)

    // Copy data from old table if it exists
    db.exec(`
      INSERT OR IGNORE INTO oauth_connections_new (
        id, company_id, provider, email, access_token, refresh_token,
        token_expires_at, last_sync_at, created_at, updated_at
      )
      SELECT
        id, company_id, provider, email, access_token, refresh_token,
        token_expires_at, last_sync_at, created_at, updated_at
      FROM oauth_connections
    `)

    // Drop old table and rename new one
    db.exec(`DROP TABLE IF EXISTS oauth_connections`)
    db.exec(`ALTER TABLE oauth_connections_new RENAME TO oauth_connections`)

    // Step 3: Create procore_mappings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS procore_mappings (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        -- Procore identifiers
        procore_company_id INTEGER NOT NULL,
        procore_entity_type TEXT NOT NULL CHECK(procore_entity_type IN ('project', 'vendor')),
        procore_entity_id INTEGER NOT NULL,
        -- Shield-AI identifiers
        shield_entity_type TEXT NOT NULL CHECK(shield_entity_type IN ('project', 'subcontractor')),
        shield_entity_id TEXT NOT NULL,
        -- Sync metadata
        last_synced_at TEXT DEFAULT (datetime('now')),
        sync_direction TEXT NOT NULL DEFAULT 'procore_to_shield' CHECK(sync_direction IN ('procore_to_shield', 'shield_to_procore', 'bidirectional')),
        sync_status TEXT NOT NULL DEFAULT 'active' CHECK(sync_status IN ('active', 'paused', 'error')),
        sync_error TEXT,
        -- Timestamps
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        -- Ensure unique mapping per entity
        UNIQUE(company_id, procore_company_id, procore_entity_type, procore_entity_id)
      )
    `)

    // Create indexes for procore_mappings
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_procore_mappings_company
      ON procore_mappings(company_id)
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_procore_mappings_procore
      ON procore_mappings(procore_company_id, procore_entity_type, procore_entity_id)
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_procore_mappings_shield
      ON procore_mappings(shield_entity_type, shield_entity_id)
    `)

    // Step 4: Create procore_sync_log table for audit trail
    db.exec(`
      CREATE TABLE IF NOT EXISTS procore_sync_log (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        procore_company_id INTEGER NOT NULL,
        sync_type TEXT NOT NULL CHECK(sync_type IN ('projects', 'vendors', 'compliance_push')),
        status TEXT NOT NULL CHECK(status IN ('started', 'completed', 'failed')),
        total_items INTEGER,
        created_count INTEGER,
        updated_count INTEGER,
        skipped_count INTEGER,
        error_count INTEGER,
        error_message TEXT,
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        duration_ms INTEGER
      )
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_procore_sync_log_company
      ON procore_sync_log(company_id, started_at DESC)
    `)

    console.log('[Migration 005] Procore integration support added successfully')
  },

  down: (db: Database) => {
    console.log('[Migration 005] Reverting Procore integration support...')

    // Drop Procore-specific tables
    db.exec(`DROP TABLE IF EXISTS procore_sync_log`)
    db.exec(`DROP TABLE IF EXISTS procore_mappings`)

    // Note: We could recreate the original oauth tables without 'procore' provider
    // but that would lose data. In practice, down migrations are rarely run.
    // The tables with 'procore' support can remain as they're backwards compatible.

    console.log('[Migration 005] Reverted (note: oauth tables retain procore support)')
  },
}

export default migration
