/**
 * Central registry of all migrations
 * Import and export all migrations here for use by runner scripts
 */

import { Migration } from './index'
import { migration as migration001 } from './001_initial_schema'
import { migration as migration002 } from './002_add_indexes'

// Export all migrations in order
export const migrations: Migration[] = [
  migration001,
  migration002
]
