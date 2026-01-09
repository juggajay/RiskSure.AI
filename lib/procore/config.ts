/**
 * Procore Integration Configuration
 *
 * Environment Variables:
 * - PROCORE_CLIENT_ID: OAuth client ID from Procore developer portal
 * - PROCORE_CLIENT_SECRET: OAuth client secret
 * - PROCORE_REDIRECT_URI: OAuth callback URL (defaults to /api/integrations/procore/callback)
 * - PROCORE_SANDBOX: Set to 'true' to use sandbox environment
 *
 * Dev Mode:
 * When PROCORE_CLIENT_ID is 'test', missing, or when NODE_ENV is development
 * with no valid credentials, the integration runs in dev mode with mock data.
 */

export interface ProcoreConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizationUrl: string
  tokenUrl: string
  apiBaseUrl: string
  scopes: string[]
  isDevMode: boolean
  isSandbox: boolean
}

/**
 * Procore OAuth scopes required for Shield-AI integration
 * Note: Procore doesn't use traditional OAuth scopes - permissions are configured
 * at the app level in the Developer Portal. We send an empty scope array.
 */
export const PROCORE_SCOPES: string[] = []

/**
 * Procore API base URLs
 */
export const PROCORE_URLS = {
  production: {
    api: 'https://api.procore.com',
    auth: 'https://login.procore.com',
  },
  sandbox: {
    api: 'https://sandbox.procore.com',
    auth: 'https://login-sandbox.procore.com',
  },
} as const

/**
 * Rate limiting configuration
 */
export const PROCORE_RATE_LIMITS = {
  requestsPerHour: 3600,
  retryAfterMs: 1000,
  maxRetries: 3,
  backoffMultiplier: 2,
} as const

/**
 * Default pagination settings
 */
export const PROCORE_PAGINATION = {
  defaultPageSize: 100,
  maxPageSize: 1000,
} as const

/**
 * Check if Procore is configured for dev mode
 */
export function isProcoreDevMode(): boolean {
  const clientId = process.env.PROCORE_CLIENT_ID

  // Explicit dev mode indicators
  if (!clientId || clientId === 'test' || clientId === 'dev') {
    return true
  }

  // In development environment without valid-looking credentials
  if (process.env.NODE_ENV === 'development') {
    // Procore client IDs are typically UUIDs or long alphanumeric strings
    if (clientId.length < 20) {
      return true
    }
  }

  return false
}

/**
 * Check if using Procore sandbox environment
 */
export function isProcoreSandbox(): boolean {
  return process.env.PROCORE_SANDBOX === 'true'
}

/**
 * Get the full Procore configuration
 */
export function getProcoreConfig(): ProcoreConfig {
  const isDevMode = isProcoreDevMode()
  const isSandbox = isProcoreSandbox()
  const urls = isSandbox ? PROCORE_URLS.sandbox : PROCORE_URLS.production

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const defaultRedirectUri = `${appUrl}/api/integrations/procore/callback`

  return {
    clientId: process.env.PROCORE_CLIENT_ID || 'test',
    clientSecret: process.env.PROCORE_CLIENT_SECRET || 'test-secret',
    redirectUri: process.env.PROCORE_REDIRECT_URI || defaultRedirectUri,
    authorizationUrl: `${urls.auth}/oauth/authorize`,
    tokenUrl: `${urls.auth}/oauth/token`,
    apiBaseUrl: urls.api,
    scopes: [...PROCORE_SCOPES],
    isDevMode,
    isSandbox,
  }
}

/**
 * Check if Procore integration is available
 */
export function isProcoreConfigured(): boolean {
  return !isProcoreDevMode()
}

/**
 * Build OAuth authorization URL
 */
export function buildProcoreAuthUrl(state: string): string {
  const config = getProcoreConfig()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
  })

  // Only add scope if there are scopes defined
  if (config.scopes.length > 0) {
    params.set('scope', config.scopes.join(' '))
  }

  return `${config.authorizationUrl}?${params.toString()}`
}

/**
 * Log Procore configuration status (for debugging)
 */
export function logProcoreStatus(): void {
  const config = getProcoreConfig()

  console.log('[Procore] Configuration Status:')
  console.log(`  - Dev Mode: ${config.isDevMode}`)
  console.log(`  - Sandbox: ${config.isSandbox}`)
  console.log(`  - API Base: ${config.apiBaseUrl}`)
  console.log(`  - Client ID: ${config.clientId.substring(0, 8)}...`)

  if (config.isDevMode) {
    console.log('[Procore] Running in DEV MODE - using mock data')
  }
}

/**
 * Environment variable names for reference
 */
export const PROCORE_ENV_VARS = {
  clientId: 'PROCORE_CLIENT_ID',
  clientSecret: 'PROCORE_CLIENT_SECRET',
  redirectUri: 'PROCORE_REDIRECT_URI',
  sandbox: 'PROCORE_SANDBOX',
} as const
