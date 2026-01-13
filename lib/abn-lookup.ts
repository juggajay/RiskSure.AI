// ABN validation and lookup utilities

// Mock ABR data for development (in production, this would call the real ABR API)
// The ABR API requires registration at https://abr.business.gov.au/Tools/WebServices
const MOCK_ABR_DATA: Record<string, { entityName: string; status: string; entityType: string }> = {
  '51824753556': { entityName: 'AUSTRALIAN BROADCASTING CORPORATION', status: 'Active', entityType: 'Commonwealth Entity' },
  '33102417032': { entityName: 'TELSTRA GROUP LIMITED', status: 'Active', entityType: 'Public Company' },
  '12345678901': { entityName: 'ABC Electrical Pty Ltd', status: 'Active', entityType: 'Private Company' },
  '99887766554': { entityName: 'Test Plumbing Services Pty Ltd', status: 'Active', entityType: 'Private Company' },
  '11222333444': { entityName: 'Test Subcontractor Pty Ltd', status: 'Active', entityType: 'Private Company' },
  '74158818056': { entityName: 'RYOX CARPENTRY & BUILDING SOLUTIONS PTY LTD', status: 'Active', entityType: 'Private Company' },
}

export interface ABNLookupResult {
  valid: boolean
  abn: string
  entityName: string | null
  status: string
  entityType: string | null
  message?: string
  source: 'mock' | 'abr'
  error?: string
}

// ABN validation helper - uses Australian checksum algorithm
export function validateABNChecksum(abn: string): boolean {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const digits = abn.split('').map(Number)
  digits[0] = digits[0] - 1 // Subtract 1 from first digit
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0)
  return sum % 89 === 0
}

// Look up ABN details from ABR (or mock data in development)
export function lookupABN(abn: string): ABNLookupResult {
  const cleanedABN = abn.replace(/\s/g, '')

  // Validate format (11 digits)
  if (!/^\d{11}$/.test(cleanedABN)) {
    return {
      valid: false,
      abn: cleanedABN,
      entityName: null,
      status: 'Invalid',
      entityType: null,
      error: 'ABN must be exactly 11 digits',
      source: 'mock'
    }
  }

  // Validate checksum
  if (!validateABNChecksum(cleanedABN)) {
    return {
      valid: false,
      abn: cleanedABN,
      entityName: null,
      status: 'Invalid',
      entityType: null,
      error: 'Invalid ABN checksum - please verify the ABN is correct',
      source: 'mock'
    }
  }

  // Look up in mock data (in production, this would call the ABR API)
  const abrData = MOCK_ABR_DATA[cleanedABN]

  if (abrData) {
    return {
      valid: true,
      abn: cleanedABN,
      entityName: abrData.entityName,
      status: abrData.status,
      entityType: abrData.entityType,
      source: 'mock'
    }
  }

  // ABN format is valid but not found in our mock data
  return {
    valid: true,
    abn: cleanedABN,
    entityName: null,
    status: 'Unknown',
    entityType: null,
    message: 'ABN format is valid but entity not found in lookup. Entity details not available.',
    source: 'mock'
  }
}

// Normalize company name for comparison
// Removes common business suffixes and normalizes whitespace/case
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common Australian business suffixes
    .replace(/\b(pty\.?\s*ltd\.?|proprietary\s+limited|limited|pty|ltd|inc\.?|incorporated|llc|llp|trading\s+as|t\/a|atf|as\s+trustee\s+for)\b/gi, '')
    // Remove punctuation
    .replace(/[.,\-'"`()&]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

// Check if two company names match (allowing for variations)
export function companyNamesMatch(submittedName: string, registeredName: string): boolean {
  const normalizedSubmitted = normalizeCompanyName(submittedName)
  const normalizedRegistered = normalizeCompanyName(registeredName)

  // Exact match after normalization
  if (normalizedSubmitted === normalizedRegistered) {
    return true
  }

  // Check if one contains the other (for cases like "ABC" vs "ABC Services")
  if (normalizedSubmitted.includes(normalizedRegistered) || normalizedRegistered.includes(normalizedSubmitted)) {
    // Only allow if the shorter one is at least 3 characters to avoid false positives
    const shorter = normalizedSubmitted.length < normalizedRegistered.length ? normalizedSubmitted : normalizedRegistered
    if (shorter.length >= 3) {
      return true
    }
  }

  return false
}
