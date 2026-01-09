/**
 * Procore Integration Module
 *
 * This module provides integration with Procore's construction management platform.
 *
 * Features:
 * - OAuth 2.0 authentication
 * - Project sync from Procore to Shield-AI
 * - Vendor sync with ABN extraction
 * - Compliance status push to Procore
 *
 * Dev Mode:
 * When PROCORE_CLIENT_ID is not configured, the integration runs in dev mode
 * with mock data, allowing development without Procore credentials.
 */

// Configuration
export {
  getProcoreConfig,
  isProcoreDevMode,
  isProcoreSandbox,
  isProcoreConfigured,
  buildProcoreAuthUrl,
  logProcoreStatus,
  PROCORE_SCOPES,
  PROCORE_URLS,
  PROCORE_RATE_LIMITS,
  PROCORE_PAGINATION,
  PROCORE_ENV_VARS,
  type ProcoreConfig,
} from './config'

// Types
export {
  type ProcoreOAuthConfig,
  type ProcoreOAuthTokens,
  type ProcoreUser,
  type ProcoreCompany,
  type ProcoreProject,
  type ProcoreProjectListResponse,
  type ProcoreVendor,
  type ProcoreVendorContact,
  type ProcoreVendorListResponse,
  type ProcoreInsuranceRecord,
  type ProcoreVendorInsurance,
  type ProcoreVendorInsuranceInput,
  type ProcoreInsuranceType,
  type ProcoreWebhookEvent,
  type ProcoreWebhookDelivery,
  type ProcoreWebhookSubscription,
  type ProcoreWebhookEventType,
  type ProcoreWebhookResourceName,
  type ProcorePaginationParams,
  type ProcoreApiError,
  type ProcoreRateLimitInfo,
  type ProcoreMapping,
  type ProcoreSyncResult,
  type ProcoreSyncBatchResult,
  type ProcoreComplianceStatus,
  type AustralianStateCode,
  AUSTRALIAN_STATE_CODES,
  SHIELD_TO_PROCORE_INSURANCE_TYPE,
  isAustralianStateCode,
  extractABNFromVendor,
} from './types'

// Client
export {
  ProcoreClient,
  createProcoreClient,
  createMockProcoreClient,
  type ProcoreClientOptions,
  type ProcoreRequestOptions,
  type ProcorePaginatedResponse,
} from './client'

// Mock Data (for testing)
export {
  MOCK_PROCORE_COMPANIES,
  MOCK_PROCORE_PROJECTS,
  MOCK_PROCORE_VENDORS,
  getMockProjects,
  getMockVendors,
  getMockProject,
  getMockVendor,
  createMockOAuthTokens,
  createMockWebhookEvent,
  mockApiDelay,
} from './mock-data'

// Sync Functions
export {
  syncProjectsFromProcore,
  syncVendorsFromProcore,
  getProcoreMapping,
  getProcoreMappings,
  getSyncHistory,
  type ProjectSyncOptions,
  type VendorSyncOptions,
} from './sync'

// Integration Hooks
export {
  pushComplianceToProcore,
  queueCompliancePush,
  getCompliancePushHistory,
} from './hooks'
