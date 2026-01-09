import { Migration } from './index'

/**
 * Migration to add Stripe billing fields to companies table
 *
 * Adds:
 * - stripe_customer_id: Links company to Stripe customer
 * - stripe_subscription_id: Current active subscription
 * - stripe_subscription_item_id: For metered billing (per-vendor)
 * - subscription_period_end: When current billing period ends
 * - trial_ends_at: When free trial ends
 * - vendor_count: Current number of active vendors (for billing)
 */
export const migration: Migration = {
  version: 4,
  name: 'stripe_billing',
  up: (db) => {
    // Add Stripe fields to companies table
    db.exec(`
      ALTER TABLE companies ADD COLUMN stripe_customer_id TEXT
    `)
    db.exec(`
      ALTER TABLE companies ADD COLUMN stripe_subscription_id TEXT
    `)
    db.exec(`
      ALTER TABLE companies ADD COLUMN stripe_subscription_item_id TEXT
    `)
    db.exec(`
      ALTER TABLE companies ADD COLUMN subscription_period_end TEXT
    `)
    db.exec(`
      ALTER TABLE companies ADD COLUMN trial_ends_at TEXT
    `)
    db.exec(`
      ALTER TABLE companies ADD COLUMN vendor_count INTEGER DEFAULT 0
    `)

    // Create indexes for Stripe lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer
      ON companies(stripe_customer_id)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription
      ON companies(stripe_subscription_id)
    `)

    // Create billing_events table to track subscription changes
    db.exec(`
      CREATE TABLE IF NOT EXISTS billing_events (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        stripe_event_id TEXT UNIQUE,
        event_type TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_billing_events_company
      ON billing_events(company_id)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_billing_events_stripe
      ON billing_events(stripe_event_id)
    `)
  },
  down: (db) => {
    // SQLite doesn't support DROP COLUMN easily
    // For a proper down migration, we'd need to recreate the table
    // For now, just drop the billing_events table and indexes
    db.exec('DROP TABLE IF EXISTS billing_events')
    db.exec('DROP INDEX IF EXISTS idx_companies_stripe_customer')
    db.exec('DROP INDEX IF EXISTS idx_companies_stripe_subscription')
    // Note: The ALTER TABLE ADD COLUMN changes cannot be easily reversed in SQLite
    // In production, consider using a database that supports DROP COLUMN
  }
}
