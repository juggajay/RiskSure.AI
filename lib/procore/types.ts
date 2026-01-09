/**
 * Procore API TypeScript Types
 *
 * Based on Procore REST API v1.x documentation
 * https://developers.procore.com/reference/rest/
 */

// ============================================================================
// OAuth & Authentication Types
// ============================================================================

export interface ProcoreOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
}

export interface ProcoreOAuthTokens {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number // Seconds until expiration
  created_at: number // Unix timestamp
}

export interface ProcoreUser {
  id: number
  login: string
  name: string
  email_address?: string
}

export interface ProcoreCompany {
  id: number
  name: string
  is_active: boolean
  logo_url?: string
  // ABN for Australian companies
  entity_type?: 'abn' | 'ein' | null
  entity_id?: string | null
}

// ============================================================================
// Project Types
// ============================================================================

export interface ProcoreOffice {
  id: number
  name: string
}

export interface ProcoreProjectStage {
  id: number
  name: string
}

export interface ProcoreProjectType {
  id: number
  name: string
}

export interface ProcoreProject {
  id: number
  name: string
  display_name: string
  project_number: string | null

  // Address fields
  address: string | null
  city: string | null
  state_code: string | null // US states (CA, NY) or Australian (NSW, VIC)
  country_code: string | null // US, AU, etc.
  zip: string | null
  latitude: number | null
  longitude: number | null

  // Project details
  description: string | null
  square_feet: number | null
  phone: string | null
  public_notes: string | null

  // Dates
  estimated_start_date: string | null // ISO date string
  estimated_completion_date: string | null
  actual_start_date: string | null
  projected_finish_date: string | null

  // Status
  active: boolean
  flag: 'Green' | 'Yellow' | 'Red' | null

  // Timestamps
  created_at: string // ISO datetime
  updated_at: string

  // Related entities
  office: ProcoreOffice | null
  project_stage: ProcoreProjectStage | null
  project_type: ProcoreProjectType | null

  // Logo
  logo_url: string | null
}

export interface ProcoreProjectListResponse {
  data: ProcoreProject[]
  // Pagination metadata (Rest v2)
  pagination?: {
    has_more: boolean
    next_cursor?: string
  }
}

// ============================================================================
// Vendor/Company Directory Types
// ============================================================================

export interface ProcoreVendorContact {
  id: number
  name: string
  email_address: string | null
  business_phone: string | null
  mobile_phone: string | null
  is_primary: boolean
}

export interface ProcoreVendor {
  id: number
  name: string
  abbreviated_name: string | null // Often used for ERP vendor ID

  // Business identification
  // For Australian companies, entity_type = 'abn' and entity_id = ABN number
  entity_type: 'abn' | 'ein' | null
  entity_id: string | null // ABN (11 digits) or EIN number

  // Alternative ID fields that may contain ABN
  license_number: string | null
  tax_id: string | null // May contain EIN/ABN in some configurations
  business_id: string | null // Generic business identifier

  // Contact info
  email_address: string | null // Company email
  business_phone: string | null
  fax_number: string | null
  website: string | null

  // Address
  address: string | null
  city: string | null
  state_code: string | null
  country_code: string | null
  zip: string | null

  // Business details
  dba: string | null // Doing Business As
  is_active: boolean

  // Classification
  vendor_group: {
    id: number
    name: string
  } | null

  // Contacts
  primary_contact: ProcoreVendorContact | null

  // Timestamps
  created_at: string
  updated_at: string

  // ERP Integration
  erp_vendor_id: string | null // For ERP-integrated accounts

  // Custom fields (fieldset dependent)
  custom_fields?: Record<string, unknown>
}

export interface ProcoreVendorListResponse {
  data: ProcoreVendor[]
  pagination?: {
    has_more: boolean
    next_cursor?: string
  }
}

// ============================================================================
// Insurance/Compliance Types (Vendor Insurances API)
// ============================================================================

/**
 * Procore Insurance Types
 * Common insurance types used in construction
 */
export type ProcoreInsuranceType =
  | 'general_liability'
  | 'workers_compensation'
  | 'professional_liability'
  | 'auto_liability'
  | 'umbrella'
  | 'builders_risk'
  | 'pollution_liability'
  | 'inland_marine'
  | 'other'

/**
 * Map Shield-AI coverage types to Procore insurance types
 */
export const SHIELD_TO_PROCORE_INSURANCE_TYPE: Record<string, ProcoreInsuranceType> = {
  'public_liability': 'general_liability',
  'products_liability': 'general_liability',
  'workers_comp': 'workers_compensation',
  'professional_indemnity': 'professional_liability',
  'motor_vehicle': 'auto_liability',
  'contract_works': 'builders_risk',
}

/**
 * Procore Vendor Insurance Record
 * Represents an insurance policy for a vendor in Procore
 *
 * API Endpoints:
 * - GET /rest/v1.0/companies/{company_id}/vendor_insurances
 * - POST /rest/v1.0/companies/{company_id}/vendor_insurances
 * - PATCH /rest/v1.0/companies/{company_id}/vendor_insurances/{id}
 * - DELETE /rest/v1.0/companies/{company_id}/vendor_insurances/{id}
 */
export interface ProcoreVendorInsurance {
  id: number
  vendor_id: number

  // Insurance details
  insurance_type: string // e.g., "General Liability", "Workers Compensation"
  insurance_type_id?: number // Reference to insurance type in Procore
  policy_number: string | null

  // Carrier/Insurer
  insurance_company: string | null // Carrier name
  agent_name: string | null
  agent_phone: string | null

  // Coverage
  limit: number | null // Coverage amount in dollars
  aggregate_limit: number | null
  deductible: number | null

  // Dates
  effective_date: string | null // ISO date
  expiration_date: string | null // ISO date

  // Status
  status: 'compliant' | 'non_compliant' | 'expired' | 'pending_review' | null
  exempt: boolean

  // Certificate info
  certificate_number: string | null
  additional_insured: boolean
  waiver_of_subrogation: boolean

  // Document attachment
  attachments?: Array<{
    id: number
    name: string
    url: string
  }>

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Create/Update Vendor Insurance Request
 */
export interface ProcoreVendorInsuranceInput {
  vendor_id: number
  insurance_type?: string
  insurance_type_id?: number
  policy_number?: string
  insurance_company?: string
  agent_name?: string
  agent_phone?: string
  limit?: number
  aggregate_limit?: number
  deductible?: number
  effective_date?: string
  expiration_date?: string
  status?: 'compliant' | 'non_compliant' | 'expired' | 'pending_review'
  exempt?: boolean
  certificate_number?: string
  additional_insured?: boolean
  waiver_of_subrogation?: boolean
}

/**
 * Legacy insurance record type for backward compatibility
 */
export interface ProcoreInsuranceRecord {
  id: number
  vendor_id: number
  insurance_type: string
  policy_number: string | null
  insurer_name: string | null
  coverage_amount: number | null
  deductible: number | null
  effective_date: string | null
  expiration_date: string | null
  status: 'valid' | 'expired' | 'pending' | null
  document_url: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Webhook Types
// ============================================================================

export type ProcoreWebhookEventType = 'create' | 'update' | 'delete'

export type ProcoreWebhookResourceName =
  | 'projects'
  | 'company_vendors'
  | 'project_vendors'
  | 'commitments'
  | 'change_orders'
  | 'submittals'
  | 'rfis'
  | 'drawings'
  | 'punch_items'
  | 'observations'
  | 'documents'
  | string // Allow other resource names

export interface ProcoreWebhookEvent {
  id: string // ULID format
  timestamp: string // ISO datetime
  resource_name: ProcoreWebhookResourceName
  resource_id: number
  event_type: ProcoreWebhookEventType
  company_id: number
  project_id: number | null
  api_version: string // e.g., "v2"
}

export interface ProcoreWebhookDelivery {
  event: ProcoreWebhookEvent
  response_status: number | null
  response_headers: Record<string, string> | null
  response_error: string | null
  response_body: string | null
}

export interface ProcoreWebhookSubscription {
  id: number
  destination_url: string
  api_version: string
  is_active: boolean
  triggers: Array<{
    resource_name: ProcoreWebhookResourceName
    event_type: ProcoreWebhookEventType
  }>
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ProcorePaginationParams {
  page?: number
  per_page?: number // Default 100, max 1000
  cursor?: string // For cursor-based pagination (v2)
}

export interface ProcoreApiError {
  error: string
  error_description?: string
  errors?: Array<{
    field: string
    message: string
  }>
}

export interface ProcoreRateLimitInfo {
  limit: number // 3600 per hour default
  remaining: number
  reset_at: string // ISO datetime
}

// ============================================================================
// Shield-AI Integration Types
// ============================================================================

/**
 * Mapping between Procore entities and Shield-AI entities
 */
export interface ProcoreMapping {
  id: string // UUID
  company_id: string // Shield-AI company ID

  // Procore identifiers
  procore_company_id: number
  procore_entity_type: 'project' | 'vendor'
  procore_entity_id: number

  // Shield-AI identifiers
  shield_entity_type: 'project' | 'subcontractor'
  shield_entity_id: string

  // Sync metadata
  last_synced_at: string
  sync_direction: 'procore_to_shield' | 'shield_to_procore' | 'bidirectional'
  sync_status: 'active' | 'paused' | 'error'
  sync_error: string | null

  created_at: string
  updated_at: string
}

/**
 * Result of a sync operation
 */
export interface ProcoreSyncResult {
  success: boolean
  operation: 'create' | 'update' | 'skip' | 'error'
  procore_id: number
  shield_id: string | null
  entity_type: 'project' | 'vendor'
  message: string
  details?: Record<string, unknown>
}

export interface ProcoreSyncBatchResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: number
  results: ProcoreSyncResult[]
  duration_ms: number
}

/**
 * Compliance status to push to Procore
 */
export interface ProcoreComplianceStatus {
  vendor_id: number
  shield_subcontractor_id: string
  compliance_status: 'compliant' | 'non_compliant' | 'pending' | 'expired'
  coverage_summary: Array<{
    type: string
    status: 'valid' | 'expired' | 'missing' | 'insufficient'
    expiry_date?: string
    amount?: number
  }>
  last_verified_at: string
  verification_id?: string
}

// ============================================================================
// Australian-Specific Types
// ============================================================================

/**
 * Australian state codes for mapping from Procore's state_code field
 */
export const AUSTRALIAN_STATE_CODES = [
  'NSW', // New South Wales
  'VIC', // Victoria
  'QLD', // Queensland
  'WA',  // Western Australia
  'SA',  // South Australia
  'TAS', // Tasmania
  'ACT', // Australian Capital Territory
  'NT',  // Northern Territory
] as const

export type AustralianStateCode = typeof AUSTRALIAN_STATE_CODES[number]

/**
 * Check if a state code is Australian
 */
export function isAustralianStateCode(code: string | null): code is AustralianStateCode {
  if (!code) return false
  return AUSTRALIAN_STATE_CODES.includes(code as AustralianStateCode)
}

/**
 * Extract ABN from a Procore vendor
 * Checks multiple possible fields where ABN might be stored
 */
export function extractABNFromVendor(vendor: ProcoreVendor): string | null {
  // Primary location: entity_id when entity_type is 'abn'
  if (vendor.entity_type === 'abn' && vendor.entity_id) {
    return vendor.entity_id
  }

  // Secondary: check tax_id field
  if (vendor.tax_id && /^\d{11}$/.test(vendor.tax_id.replace(/\s/g, ''))) {
    return vendor.tax_id.replace(/\s/g, '')
  }

  // Tertiary: check business_id field
  if (vendor.business_id && /^\d{11}$/.test(vendor.business_id.replace(/\s/g, ''))) {
    return vendor.business_id.replace(/\s/g, '')
  }

  // Check abbreviated_name (sometimes used for external IDs)
  if (vendor.abbreviated_name && /^\d{11}$/.test(vendor.abbreviated_name.replace(/\s/g, ''))) {
    return vendor.abbreviated_name.replace(/\s/g, '')
  }

  return null
}
