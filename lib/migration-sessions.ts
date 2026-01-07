/**
 * Shared in-memory storage for migration sessions
 * In production, this would be stored in the database
 */

import type { MigrationSession } from '@/lib/document-classifier'

// Global session storage - survives across API route imports
const globalForMigration = globalThis as typeof globalThis & {
  migrationSessions?: Map<string, MigrationSession>
}

export const migrationSessions = globalForMigration.migrationSessions ?? new Map<string, MigrationSession>()

if (process.env.NODE_ENV !== 'production') {
  globalForMigration.migrationSessions = migrationSessions
}

export function getMigrationSession(sessionId: string): MigrationSession | undefined {
  return migrationSessions.get(sessionId)
}

export function setMigrationSession(sessionId: string, session: MigrationSession): void {
  migrationSessions.set(sessionId, session)
}

export function deleteMigrationSession(sessionId: string): boolean {
  return migrationSessions.delete(sessionId)
}

export function getAllMigrationSessions(): MigrationSession[] {
  return Array.from(migrationSessions.values())
}
