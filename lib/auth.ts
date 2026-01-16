import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

// Types
export interface User {
  _id: string
  id?: string
  email: string
  name: string
  role: string
  companyId?: string
  company_id?: string
  passwordHash?: string
  password_hash?: string
  created_at?: string
  updated_at?: string
}

export interface Session {
  _id?: string
  id?: string
  userId?: string
  user_id?: string
  token: string
  expiresAt?: number
  expires_at?: string
  created_at?: string
}

const JWT_SECRET = process.env.JWT_SECRET

// Validate JWT_SECRET at startup
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production')
  }
  console.warn('WARNING: JWT_SECRET not set. Using insecure development secret.')
}

/**
 * Get Convex client for server-side operations
 */
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  }
  return new ConvexHttpClient(convexUrl)
}

/**
 * Get the JWT secret, throwing in production if not set
 */
export function getJwtSecret(): string {
  if (JWT_SECRET) return JWT_SECRET
  if (process.env.NODE_ENV !== 'production') {
    return 'riskshield-development-secret-key-DO-NOT-USE-IN-PRODUCTION'
  }
  throw new Error('JWT_SECRET must be set')
}

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
 * - At least one special character
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
  // Security: Require special characters to increase password strength
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Get user by session token (uses Convex)
 */
export async function getUserByToken(token: string): Promise<User | null> {
  try {
    const convex = getConvexClient()
    const result = await convex.query(api.auth.getUserWithSession, { token })

    if (!result || !result.user) {
      return null
    }

    // Map Convex user to expected format
    const user = result.user
    return {
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      company_id: user.companyId,
      created_at: user._creationTime ? new Date(user._creationTime).toISOString() : undefined,
    } as User
  } catch (error) {
    console.error('getUserByToken error:', error)
    return null
  }
}

/**
 * Create a magic link token for portal users (uses Convex)
 */
export async function createMagicLinkToken(email: string): Promise<{ token: string; expiresAt: string }> {
  const convex = getConvexClient()
  const token = uuidv4()
  const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes

  await convex.mutation(api.auth.createMagicLinkToken, {
    email: email.toLowerCase(),
    token,
    expiresAt,
  })

  return { token, expiresAt: new Date(expiresAt).toISOString() }
}

/**
 * Validate a magic link token (uses Convex)
 */
export async function validateMagicLinkToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    const convex = getConvexClient()
    const tokenDoc = await convex.query(api.auth.getMagicLinkToken, { token })

    if (!tokenDoc) {
      return { valid: false, error: 'Invalid or expired magic link' }
    }

    return { valid: true, email: tokenDoc.email }
  } catch (error) {
    console.error('validateMagicLinkToken error:', error)
    return { valid: false, error: 'Invalid or expired magic link' }
  }
}

/**
 * Use a magic link token (mark as used) (uses Convex)
 */
export async function useMagicLinkToken(token: string): Promise<void> {
  const convex = getConvexClient()
  await convex.mutation(api.auth.markMagicLinkTokenUsed, { token })
}

/**
 * Get or create a portal user by email (uses Convex)
 */
export async function getOrCreatePortalUser(email: string, role: 'subcontractor' | 'broker' = 'subcontractor'): Promise<User> {
  const convex = getConvexClient()
  const normalizedEmail = email.toLowerCase()

  // Check if user exists
  const existingUser = await convex.query(api.users.getByEmail, { email: normalizedEmail })

  if (existingUser) {
    return {
      _id: existingUser._id,
      id: existingUser._id,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role,
      companyId: existingUser.companyId,
      company_id: existingUser.companyId,
    } as User
  }

  // Create new portal user
  const userId = await convex.mutation(api.users.create, {
    email: normalizedEmail,
    name: 'Portal User',
    role: role,
    passwordHash: '$portal-user-no-password$',
  })

  const newUser = await convex.query(api.users.getById, { id: userId })

  if (!newUser) {
    throw new Error('Failed to get or create portal user')
  }

  return {
    _id: newUser._id,
    id: newUser._id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    companyId: newUser.companyId,
    company_id: newUser.companyId,
  } as User
}

/**
 * Create a portal session for a user (uses Convex)
 */
export async function createPortalSession(userId: string): Promise<{ session: Session; token: string }> {
  const convex = getConvexClient()
  const sessionId = uuidv4()
  // Security: Explicitly specify algorithm to prevent algorithm confusion attacks
  const token = jwt.sign({ sessionId, userId, isPortal: true }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '24h' })
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours for portal

  // Need to convert userId string to Convex Id - the route should pass the proper Id
  await convex.mutation(api.auth.createSession, {
    userId: userId as any, // Trust that userId is a valid Convex Id
    token,
    expiresAt,
  })

  const session: Session = {
    id: sessionId,
    userId: userId,
    user_id: userId,
    token,
    expiresAt,
    expires_at: new Date(expiresAt).toISOString(),
    created_at: new Date().toISOString(),
  }

  return { session, token }
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    // Security: Explicitly specify allowed algorithms
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as { sessionId: string; userId: string }
    const convex = getConvexClient()

    const session = await convex.query(api.auth.getSessionByToken, { token })

    if (!session) {
      return { valid: false, error: 'Session not found' }
    }

    if (session.expiresAt < Date.now()) {
      return { valid: false, error: 'Session expired' }
    }

    return { valid: true, userId: decoded.userId }
  } catch (error) {
    return { valid: false, error: 'Invalid token' }
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  try {
    const convex = getConvexClient()
    await convex.mutation(api.auth.deleteSession, { token })
  } catch {
    // Token invalid, nothing to delete
  }
}
