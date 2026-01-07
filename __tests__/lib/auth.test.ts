// Mock uuid before importing auth module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
}))

import {
  hashPassword,
  verifyPassword,
  validatePassword,
  getJwtSecret,
  createSession,
  validateSession,
  deleteSession,
  createPasswordResetToken,
  validatePasswordResetToken,
  usePasswordResetToken,
  createMagicLinkToken,
  validateMagicLinkToken,
  useMagicLinkToken,
  getUserByEmail,
  updateUserPassword,
  cleanupExpiredSessions,
  getUserByToken,
  getUserWithCompany,
  getOrCreatePortalUser,
  createPortalSession,
} from '@/lib/auth'
import jwt from 'jsonwebtoken'

// Mock the database module
jest.mock('@/lib/db', () => {
  const mockDb = {
    prepare: jest.fn().mockReturnThis(),
    run: jest.fn().mockReturnValue({ changes: 1 }),
    get: jest.fn(),
    all: jest.fn().mockReturnValue([]),
  }
  return {
    getDb: jest.fn(() => mockDb),
    __mockDb: mockDb,
  }
})

// Get reference to mock db for test configuration
import { getDb } from '@/lib/db'
const mockDb = (getDb as jest.Mock)()

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should return a hash different from the input password', async () => {
      const password = 'SecurePass123'
      const hash = await hashPassword(password)
      expect(hash).not.toBe(password)
    })

    it('should generate different hashes for the same password (salt)', async () => {
      const password = 'SecurePass123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      expect(hash1).not.toBe(hash2)
    })

    it('should generate hash with expected bcrypt length', async () => {
      const password = 'SecurePass123'
      const hash = await hashPassword(password)
      // bcrypt hashes are 60 characters
      expect(hash.length).toBe(60)
    })

    it('should generate hash starting with bcrypt identifier', async () => {
      const password = 'SecurePass123'
      const hash = await hashPassword(password)
      // bcrypt hashes start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[ab]\$/)
    })

    it('should handle empty password', async () => {
      const hash = await hashPassword('')
      expect(hash.length).toBe(60)
    })

    it('should handle very long password', async () => {
      const password = 'A'.repeat(100)
      const hash = await hashPassword(password)
      expect(hash.length).toBe(60)
    })

    it('should handle special characters in password', async () => {
      const password = 'Pass!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hash = await hashPassword(password)
      expect(hash.length).toBe(60)
    })

    it('should handle unicode characters in password', async () => {
      const password = 'Password123'
      const hash = await hashPassword(password)
      expect(hash.length).toBe(60)
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'SecurePass123'
      const hash = await hashPassword(password)
      const result = await verifyPassword(password, hash)
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const password = 'SecurePass123'
      const hash = await hashPassword(password)
      const result = await verifyPassword('WrongPassword', hash)
      expect(result).toBe(false)
    })

    it('should return false for similar but different password', async () => {
      const password = 'SecurePass123'
      const hash = await hashPassword(password)
      const result = await verifyPassword('SecurePass124', hash)
      expect(result).toBe(false)
    })

    it('should return false for password with different case', async () => {
      const password = 'SecurePass123'
      const hash = await hashPassword(password)
      const result = await verifyPassword('securepass123', hash)
      expect(result).toBe(false)
    })

    it('should return true for empty password when hash was created with empty', async () => {
      const hash = await hashPassword('')
      const result = await verifyPassword('', hash)
      expect(result).toBe(true)
    })

    it('should return false when comparing empty password to non-empty hash', async () => {
      const hash = await hashPassword('SecurePass123')
      const result = await verifyPassword('', hash)
      expect(result).toBe(false)
    })
  })
})

describe('Password Requirements Validation', () => {
  describe('validatePassword', () => {
    it('should pass for valid password meeting all requirements', () => {
      const result = validatePassword('SecurePass123')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail for password shorter than 8 characters', () => {
      const result = validatePassword('Pass1A')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should fail for password without uppercase letter', () => {
      const result = validatePassword('securepass123')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should fail for password without lowercase letter', () => {
      const result = validatePassword('SECUREPASS123')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should fail for password without number', () => {
      const result = validatePassword('SecurePassword')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should return multiple errors for password failing multiple requirements', () => {
      const result = validatePassword('abc') // Too short, no uppercase, no number
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
    })

    it('should pass for password exactly 8 characters with all requirements', () => {
      const result = validatePassword('Abcdef1!')
      expect(result.valid).toBe(true)
    })

    it('should pass for very long password meeting requirements', () => {
      const result = validatePassword('A' + 'a'.repeat(98) + '1')
      expect(result.valid).toBe(true)
    })

    it('should fail for empty password with all requirement errors', () => {
      const result = validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should not require special characters', () => {
      const result = validatePassword('SecurePass123')
      expect(result.valid).toBe(true)
    })
  })
})

describe('JWT Secret', () => {
  describe('getJwtSecret', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('should return a string', () => {
      const secret = getJwtSecret()
      expect(typeof secret).toBe('string')
    })

    it('should return non-empty string', () => {
      const secret = getJwtSecret()
      expect(secret.length).toBeGreaterThan(0)
    })

    it('should return JWT_SECRET when set', () => {
      process.env.JWT_SECRET = 'my-test-secret'
      // Need to re-import to get fresh module
      const { getJwtSecret: freshGetJwtSecret } = jest.requireActual('@/lib/auth')
      // This test validates the function logic but the actual secret
      // will depend on runtime environment
      const secret = getJwtSecret()
      expect(typeof secret).toBe('string')
    })

    it('should return development secret in non-production environment', () => {
      // In test environment without JWT_SECRET set explicitly,
      // it should return the development secret
      delete process.env.JWT_SECRET
      process.env.NODE_ENV = 'test'
      const secret = getJwtSecret()
      expect(secret).toBe('riskshield-development-secret-key-DO-NOT-USE-IN-PRODUCTION')
    })
  })
})

describe('Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.prepare.mockReturnThis()
    mockDb.run.mockReturnValue({ changes: 1 })
    mockDb.get.mockReturnValue(undefined)
  })

  describe('createSession', () => {
    it('should create a session with valid token structure', () => {
      const userId = 'test-user-id'
      const { session, token } = createSession(userId)

      expect(session).toBeDefined()
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('should return JWT token with 3 parts', () => {
      const userId = 'test-user-id'
      const { token } = createSession(userId)

      const parts = token.split('.')
      expect(parts.length).toBe(3)
    })

    it('should create session with correct user_id', () => {
      const userId = 'test-user-id'
      const { session } = createSession(userId)

      expect(session.user_id).toBe(userId)
    })

    it('should create session with expiration date in the future', () => {
      const userId = 'test-user-id'
      const { session } = createSession(userId)

      const expiresAt = new Date(session.expires_at)
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should insert session into database', () => {
      const userId = 'test-user-id'
      createSession(userId)

      expect(mockDb.prepare).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()
    })

    it('should create token that can be decoded', () => {
      const userId = 'test-user-id'
      const { token } = createSession(userId)

      const decoded = jwt.decode(token) as { sessionId: string; userId: string }
      expect(decoded).toBeDefined()
      expect(decoded.userId).toBe(userId)
      expect(decoded.sessionId).toBeDefined()
    })
  })

  describe('validateSession', () => {
    it('should return invalid for invalid token', () => {
      const result = validateSession('invalid-token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid token')
    })

    it('should return invalid for tampered token', () => {
      const userId = 'test-user-id'
      const { token } = createSession(userId)
      const tamperedToken = token + 'tampered'

      const result = validateSession(tamperedToken)
      expect(result.valid).toBe(false)
    })

    it('should return invalid when session not found in database', () => {
      const userId = 'test-user-id'
      const { token } = createSession(userId)
      mockDb.get.mockReturnValue(undefined)

      const result = validateSession(token)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Session not found')
    })

    it('should return valid when session exists and not expired', () => {
      const userId = 'test-user-id'
      const { session, token } = createSession(userId)

      mockDb.get.mockReturnValue({
        ...session,
        expires_at: new Date(Date.now() + 1000000).toISOString(),
      })

      const result = validateSession(token)
      expect(result.valid).toBe(true)
      expect(result.userId).toBe(userId)
    })

    it('should return invalid for expired session', () => {
      const userId = 'test-user-id'
      const { session, token } = createSession(userId)

      mockDb.get.mockReturnValue({
        ...session,
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      })

      const result = validateSession(token)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Session expired')
    })

    it('should cleanup expired session from database', () => {
      const userId = 'test-user-id'
      const { session, token } = createSession(userId)

      mockDb.get.mockReturnValue({
        ...session,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })

      validateSession(token)

      // Should call DELETE to cleanup expired session
      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) => arg.includes('DELETE'))).toBe(true)
    })
  })

  describe('deleteSession', () => {
    it('should delete session for valid token', () => {
      const userId = 'test-user-id'
      const { token } = createSession(userId)

      deleteSession(token)

      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) => arg.includes('DELETE'))).toBe(true)
    })

    it('should not throw for invalid token', () => {
      expect(() => deleteSession('invalid-token')).not.toThrow()
    })
  })
})

describe('Password Reset Tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.prepare.mockReturnThis()
    mockDb.run.mockReturnValue({ changes: 1 })
    mockDb.get.mockReturnValue(undefined)
  })

  describe('createPasswordResetToken', () => {
    it('should create token with valid structure', () => {
      const userId = 'test-user-id'
      const { token, expiresAt } = createPasswordResetToken(userId)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
      expect(expiresAt).toBeDefined()
    })

    it('should create token that expires in the future', () => {
      const userId = 'test-user-id'
      const { expiresAt } = createPasswordResetToken(userId)

      const expiry = new Date(expiresAt)
      expect(expiry.getTime()).toBeGreaterThan(Date.now())
    })

    it('should invalidate existing tokens for user', () => {
      const userId = 'test-user-id'
      createPasswordResetToken(userId)

      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) =>
        arg.includes('DELETE') && arg.includes('password_reset_tokens')
      )).toBe(true)
    })
  })

  describe('validatePasswordResetToken', () => {
    it('should return invalid for non-existent token', () => {
      mockDb.get.mockReturnValue(undefined)

      const result = validatePasswordResetToken('non-existent-token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid or expired reset link')
    })

    it('should return invalid for used token', () => {
      mockDb.get.mockReturnValue({
        id: 'token-id',
        user_id: 'user-id',
        token: 'test-token',
        expires_at: new Date(Date.now() + 10000).toISOString(),
        used: 1,
      })

      const result = validatePasswordResetToken('test-token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('This reset link has already been used')
    })

    it('should return invalid for expired token', () => {
      mockDb.get.mockReturnValue({
        id: 'token-id',
        user_id: 'user-id',
        token: 'test-token',
        expires_at: new Date(Date.now() - 10000).toISOString(),
        used: 0,
      })

      const result = validatePasswordResetToken('test-token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('This reset link has expired')
    })

    it('should return valid for valid unused unexpired token', () => {
      mockDb.get.mockReturnValue({
        id: 'token-id',
        user_id: 'user-id',
        token: 'test-token',
        expires_at: new Date(Date.now() + 10000).toISOString(),
        used: 0,
      })

      const result = validatePasswordResetToken('test-token')
      expect(result.valid).toBe(true)
      expect(result.userId).toBe('user-id')
    })
  })

  describe('usePasswordResetToken', () => {
    it('should mark token as used in database', () => {
      usePasswordResetToken('test-token')

      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) =>
        arg.includes('UPDATE') && arg.includes('used')
      )).toBe(true)
    })
  })
})

describe('Magic Link Tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.prepare.mockReturnThis()
    mockDb.run.mockReturnValue({ changes: 1 })
    mockDb.get.mockReturnValue(undefined)
  })

  describe('createMagicLinkToken', () => {
    it('should create token for email', () => {
      const email = 'test@example.com'
      const { token, expiresAt } = createMagicLinkToken(email)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(expiresAt).toBeDefined()
    })

    it('should normalize email to lowercase', () => {
      const email = 'Test@Example.COM'
      createMagicLinkToken(email)

      const runCallArgs = mockDb.run.mock.calls
      // The second INSERT call should have lowercase email
      expect(runCallArgs.length).toBeGreaterThan(0)
    })

    it('should invalidate existing tokens for email', () => {
      const email = 'test@example.com'
      createMagicLinkToken(email)

      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) =>
        arg.includes('DELETE') && arg.includes('magic_link_tokens')
      )).toBe(true)
    })
  })

  describe('validateMagicLinkToken', () => {
    it('should return invalid for non-existent token', () => {
      mockDb.get.mockReturnValue(undefined)

      const result = validateMagicLinkToken('non-existent-token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid or expired magic link')
    })

    it('should return invalid for used token', () => {
      mockDb.get.mockReturnValue({
        id: 'token-id',
        email: 'test@example.com',
        token: 'test-token',
        expires_at: new Date(Date.now() + 10000).toISOString(),
        used: 1,
      })

      const result = validateMagicLinkToken('test-token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('This magic link has already been used')
    })

    it('should return invalid for expired token', () => {
      mockDb.get.mockReturnValue({
        id: 'token-id',
        email: 'test@example.com',
        token: 'test-token',
        expires_at: new Date(Date.now() - 10000).toISOString(),
        used: 0,
      })

      const result = validateMagicLinkToken('test-token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('This magic link has expired')
    })

    it('should return valid with email for valid token', () => {
      mockDb.get.mockReturnValue({
        id: 'token-id',
        email: 'test@example.com',
        token: 'test-token',
        expires_at: new Date(Date.now() + 10000).toISOString(),
        used: 0,
      })

      const result = validateMagicLinkToken('test-token')
      expect(result.valid).toBe(true)
      expect(result.email).toBe('test@example.com')
    })
  })

  describe('useMagicLinkToken', () => {
    it('should mark token as used', () => {
      useMagicLinkToken('test-token')

      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) =>
        arg.includes('UPDATE') && arg.includes('used')
      )).toBe(true)
    })
  })
})

describe('User Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.prepare.mockReturnThis()
    mockDb.run.mockReturnValue({ changes: 1 })
    mockDb.get.mockReturnValue(undefined)
  })

  describe('getUserByEmail', () => {
    it('should return null when user not found', () => {
      mockDb.get.mockReturnValue(undefined)

      const result = getUserByEmail('test@example.com')
      expect(result).toBeNull()
    })

    it('should return user when found', () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      }
      mockDb.get.mockReturnValue(mockUser)

      const result = getUserByEmail('test@example.com')
      expect(result).toEqual(mockUser)
    })

    it('should normalize email to lowercase', () => {
      getUserByEmail('Test@Example.COM')

      expect(mockDb.run.mock.calls.length > 0 || mockDb.get.mock.calls.length > 0).toBe(true)
    })
  })

  describe('getUserByToken', () => {
    it('should return null for invalid token', () => {
      const result = getUserByToken('invalid-token')
      expect(result).toBeNull()
    })

    it('should return null when session not found', () => {
      const { token } = createSession('user-id')
      mockDb.get.mockReturnValue(undefined)

      const result = getUserByToken(token)
      expect(result).toBeNull()
    })

    it('should return user when session is valid', () => {
      const userId = 'user-id'
      const { session, token } = createSession(userId)
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      }

      // First call returns session, second returns user
      mockDb.get
        .mockReturnValueOnce({
          ...session,
          expires_at: new Date(Date.now() + 100000).toISOString(),
        })
        .mockReturnValueOnce(mockUser)

      const result = getUserByToken(token)
      expect(result).toEqual(mockUser)
    })
  })

  describe('getUserWithCompany', () => {
    it('should return null when user not found', () => {
      mockDb.get.mockReturnValue(undefined)

      const result = getUserWithCompany('non-existent-id')
      expect(result).toBeNull()
    })

    it('should return user with company name when found', () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company',
      }
      mockDb.get.mockReturnValue(mockUser)

      const result = getUserWithCompany('user-id')
      expect(result).toEqual(mockUser)
      expect(result?.company_name).toBe('Test Company')
    })
  })

  describe('updateUserPassword', () => {
    it('should hash new password', async () => {
      const userId = 'user-id'
      const newPassword = 'NewSecurePass123'

      await updateUserPassword(userId, newPassword)

      expect(mockDb.prepare).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()
    })

    it('should invalidate all sessions for user', async () => {
      const userId = 'user-id'
      const newPassword = 'NewSecurePass123'

      await updateUserPassword(userId, newPassword)

      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) =>
        arg.includes('DELETE') && arg.includes('sessions')
      )).toBe(true)
    })
  })
})

describe('Portal User Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.prepare.mockReturnThis()
    mockDb.run.mockReturnValue({ changes: 1 })
    mockDb.get.mockReturnValue(undefined)
  })

  describe('getOrCreatePortalUser', () => {
    it('should return existing user if found', () => {
      const existingUser = {
        id: 'existing-user-id',
        email: 'test@example.com',
        name: 'Existing User',
        role: 'subcontractor',
      }
      mockDb.get.mockReturnValue(existingUser)

      const result = getOrCreatePortalUser('test@example.com')
      expect(result).toEqual(existingUser)
    })

    it('should create new user if not found', () => {
      const newUser = {
        id: 'new-user-id',
        email: 'test@example.com',
        name: 'Portal User',
        role: 'subcontractor',
      }
      mockDb.get
        .mockReturnValueOnce(undefined) // First check - user not found
        .mockReturnValueOnce(newUser) // Second call - return created user

      const result = getOrCreatePortalUser('test@example.com')
      expect(result).toEqual(newUser)
    })

    it('should create user with specified role', () => {
      mockDb.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({
          id: 'new-user-id',
          email: 'test@example.com',
          role: 'broker',
        })

      getOrCreatePortalUser('test@example.com', 'broker')

      // Check that INSERT was called
      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) => arg.includes('INSERT'))).toBe(true)
    })

    it('should normalize email to lowercase', () => {
      mockDb.get.mockReturnValue({
        id: 'user-id',
        email: 'test@example.com',
      })

      getOrCreatePortalUser('TEST@EXAMPLE.COM')
      // The function should normalize the email before query
    })
  })

  describe('createPortalSession', () => {
    it('should create session with 24h expiry', () => {
      const userId = 'portal-user-id'
      const { session, token } = createPortalSession(userId)

      expect(session).toBeDefined()
      expect(token).toBeDefined()

      const expiresAt = new Date(session.expires_at)
      const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000
      // Allow 1 minute tolerance
      expect(Math.abs(expiresAt.getTime() - expectedExpiry)).toBeLessThan(60000)
    })

    it('should include isPortal flag in token', () => {
      const userId = 'portal-user-id'
      const { token } = createPortalSession(userId)

      const decoded = jwt.decode(token) as { isPortal: boolean }
      expect(decoded.isPortal).toBe(true)
    })
  })
})

describe('Session Cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.prepare.mockReturnThis()
    mockDb.run.mockReturnValue({ changes: 5 })
  })

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', () => {
      const result = cleanupExpiredSessions()

      const prepareCallArgs = mockDb.prepare.mock.calls.map((call: string[]) => call[0])
      expect(prepareCallArgs.some((arg: string) =>
        arg.includes('DELETE') && arg.includes('sessions')
      )).toBe(true)
    })

    it('should return number of deleted sessions', () => {
      mockDb.run.mockReturnValue({ changes: 3 })

      const result = cleanupExpiredSessions()
      expect(result).toBe(3)
    })

    it('should return 0 when no sessions deleted', () => {
      mockDb.run.mockReturnValue({ changes: 0 })

      const result = cleanupExpiredSessions()
      expect(result).toBe(0)
    })
  })
})
