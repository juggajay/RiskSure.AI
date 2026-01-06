import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { getDb, type User, type Session } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'riskshield-development-secret-key-change-in-production'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 hours in milliseconds

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Compare password with hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Validate password requirements
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create a session for a user
 */
export function createSession(userId: string): { session: Session; token: string } {
  const db = getDb()
  const sessionId = uuidv4()
  const token = jwt.sign({ sessionId, userId }, JWT_SECRET, { expiresIn: '8h' })
  const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString()

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(sessionId, userId, token, expiresAt)

  const session: Session = {
    id: sessionId,
    user_id: userId,
    token,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  }

  return { session, token }
}

/**
 * Validate a session token
 */
export function validateSession(token: string): { valid: boolean; userId?: string; error?: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sessionId: string; userId: string }
    const db = getDb()

    const session = db.prepare(`
      SELECT * FROM sessions WHERE id = ? AND token = ?
    `).get(decoded.sessionId, token) as Session | undefined

    if (!session) {
      return { valid: false, error: 'Session not found' }
    }

    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id)
      return { valid: false, error: 'Session expired' }
    }

    return { valid: true, userId: session.user_id }
  } catch (error) {
    return { valid: false, error: 'Invalid token' }
  }
}

/**
 * Get user by session token
 */
export function getUserByToken(token: string): User | null {
  const validation = validateSession(token)
  if (!validation.valid || !validation.userId) {
    return null
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(validation.userId) as User | undefined
  return user || null
}

/**
 * Delete a session (logout)
 */
export function deleteSession(token: string): void {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sessionId: string }
    const db = getDb()
    db.prepare('DELETE FROM sessions WHERE id = ?').run(decoded.sessionId)
  } catch {
    // Token invalid, nothing to delete
  }
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const db = getDb()
  const result = db.prepare(`
    DELETE FROM sessions WHERE expires_at < datetime('now')
  `).run()
  return result.changes
}

/**
 * Get user with company info
 */
export function getUserWithCompany(userId: string): (User & { company_name?: string }) | null {
  const db = getDb()
  const user = db.prepare(`
    SELECT u.*, c.name as company_name
    FROM users u
    LEFT JOIN companies c ON u.company_id = c.id
    WHERE u.id = ?
  `).get(userId) as (User & { company_name?: string }) | undefined
  return user || null
}
