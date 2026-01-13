/**
 * Procore Configuration Tests
 *
 * Tests for environment configuration, dev mode detection, and URL building.
 */

import {
  isProcoreDevMode,
  isProcoreSandbox,
  getProcoreConfig,
  buildProcoreAuthUrl,
  isProcoreConfigured,
  PROCORE_URLS,
  PROCORE_RATE_LIMITS,
  PROCORE_PAGINATION,
} from '@/lib/procore/config'

describe('Procore Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isProcoreDevMode', () => {
    it('should return true when PROCORE_CLIENT_ID is not set', () => {
      delete process.env.PROCORE_CLIENT_ID
      expect(isProcoreDevMode()).toBe(true)
    })

    it('should return true when PROCORE_CLIENT_ID is "test"', () => {
      process.env.PROCORE_CLIENT_ID = 'test'
      expect(isProcoreDevMode()).toBe(true)
    })

    it('should return true when PROCORE_CLIENT_ID is "dev"', () => {
      process.env.PROCORE_CLIENT_ID = 'dev'
      expect(isProcoreDevMode()).toBe(true)
    })

    it('should return false when PROCORE_CLIENT_ID is a valid-looking key', () => {
      process.env.PROCORE_CLIENT_ID = 'cTyCKK5hQQGxm1fURogZOmcrnGiAtcdjBU5D8cW1hyg'
      process.env.NODE_ENV = 'production'
      expect(isProcoreDevMode()).toBe(false)
    })

    it('should return true in development with short client ID', () => {
      process.env.PROCORE_CLIENT_ID = 'short'
      process.env.NODE_ENV = 'development'
      expect(isProcoreDevMode()).toBe(true)
    })
  })

  describe('isProcoreSandbox', () => {
    it('should return true when PROCORE_SANDBOX is "true"', () => {
      process.env.PROCORE_SANDBOX = 'true'
      expect(isProcoreSandbox()).toBe(true)
    })

    it('should return false when PROCORE_SANDBOX is not set', () => {
      delete process.env.PROCORE_SANDBOX
      expect(isProcoreSandbox()).toBe(false)
    })

    it('should return false when PROCORE_SANDBOX is "false"', () => {
      process.env.PROCORE_SANDBOX = 'false'
      expect(isProcoreSandbox()).toBe(false)
    })
  })

  describe('getProcoreConfig', () => {
    it('should return sandbox URLs when PROCORE_SANDBOX is true', () => {
      process.env.PROCORE_SANDBOX = 'true'
      process.env.PROCORE_CLIENT_ID = 'cTyCKK5hQQGxm1fURogZOmcrnGiAtcdjBU5D8cW1hyg'
      process.env.PROCORE_CLIENT_SECRET = 'test-secret'

      const config = getProcoreConfig()

      expect(config.apiBaseUrl).toBe(PROCORE_URLS.sandbox.api)
      expect(config.authorizationUrl).toContain(PROCORE_URLS.sandbox.auth)
      expect(config.tokenUrl).toContain(PROCORE_URLS.sandbox.auth)
      expect(config.isSandbox).toBe(true)
    })

    it('should return production URLs when PROCORE_SANDBOX is false', () => {
      process.env.PROCORE_SANDBOX = 'false'
      process.env.PROCORE_CLIENT_ID = 'cTyCKK5hQQGxm1fURogZOmcrnGiAtcdjBU5D8cW1hyg'
      process.env.PROCORE_CLIENT_SECRET = 'test-secret'
      process.env.NODE_ENV = 'production'

      const config = getProcoreConfig()

      expect(config.apiBaseUrl).toBe(PROCORE_URLS.production.api)
      expect(config.authorizationUrl).toContain(PROCORE_URLS.production.auth)
      expect(config.isSandbox).toBe(false)
    })

    it('should use default redirect URI when not specified', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.risksure.ai'
      delete process.env.PROCORE_REDIRECT_URI

      const config = getProcoreConfig()

      expect(config.redirectUri).toBe('https://app.risksure.ai/api/integrations/procore/callback')
    })

    it('should use custom redirect URI when specified', () => {
      process.env.PROCORE_REDIRECT_URI = 'https://custom.example.com/callback'

      const config = getProcoreConfig()

      expect(config.redirectUri).toBe('https://custom.example.com/callback')
    })

    it('should indicate dev mode correctly', () => {
      process.env.PROCORE_CLIENT_ID = 'test'

      const config = getProcoreConfig()

      expect(config.isDevMode).toBe(true)
    })
  })

  describe('buildProcoreAuthUrl', () => {
    beforeEach(() => {
      process.env.PROCORE_CLIENT_ID = 'test-client-id-long-enough'
      process.env.PROCORE_REDIRECT_URI = 'https://app.risksure.ai/api/integrations/procore/callback'
      process.env.PROCORE_SANDBOX = 'true'
    })

    it('should build valid OAuth URL with state', () => {
      const state = 'test-state-12345'
      const url = buildProcoreAuthUrl(state)

      expect(url).toContain('oauth/authorize')
      expect(url).toContain('response_type=code')
      expect(url).toContain(`state=${state}`)
      expect(url).toContain('client_id=')
      expect(url).toContain('redirect_uri=')
    })

    it('should use sandbox auth URL when sandbox is enabled', () => {
      process.env.PROCORE_SANDBOX = 'true'
      const url = buildProcoreAuthUrl('state')

      expect(url).toContain('login-sandbox.procore.com')
    })

    it('should use production auth URL when sandbox is disabled', () => {
      process.env.PROCORE_SANDBOX = 'false'
      const url = buildProcoreAuthUrl('state')

      expect(url).toContain('login.procore.com')
    })

    it('should URL encode the redirect URI', () => {
      const url = buildProcoreAuthUrl('state')

      // Should contain encoded redirect_uri
      expect(url).toContain('redirect_uri=')
      expect(url).toContain(encodeURIComponent('https://app.risksure.ai/api/integrations/procore/callback'))
    })
  })

  describe('isProcoreConfigured', () => {
    it('should return true when not in dev mode', () => {
      process.env.PROCORE_CLIENT_ID = 'cTyCKK5hQQGxm1fURogZOmcrnGiAtcdjBU5D8cW1hyg'
      process.env.NODE_ENV = 'production'

      expect(isProcoreConfigured()).toBe(true)
    })

    it('should return false when in dev mode', () => {
      process.env.PROCORE_CLIENT_ID = 'test'

      expect(isProcoreConfigured()).toBe(false)
    })
  })

  describe('Constants', () => {
    it('should have correct rate limit values', () => {
      expect(PROCORE_RATE_LIMITS.requestsPerHour).toBe(3600)
      expect(PROCORE_RATE_LIMITS.maxRetries).toBe(3)
      expect(PROCORE_RATE_LIMITS.backoffMultiplier).toBe(2)
    })

    it('should have correct pagination defaults', () => {
      expect(PROCORE_PAGINATION.defaultPageSize).toBe(100)
      expect(PROCORE_PAGINATION.maxPageSize).toBe(1000)
    })

    it('should have correct URL endpoints', () => {
      expect(PROCORE_URLS.production.api).toBe('https://api.procore.com')
      expect(PROCORE_URLS.sandbox.api).toBe('https://sandbox.procore.com')
    })
  })
})
