/**
 * Mock Data for Procore Integration Development
 *
 * This data is used when running in dev mode (no Procore credentials).
 * Includes realistic Australian construction projects and vendors.
 */

import type {
  ProcoreProject,
  ProcoreVendor,
  ProcoreCompany,
  ProcoreOAuthTokens,
  ProcoreWebhookEvent,
} from './types'

// ============================================================================
// Mock Companies
// ============================================================================

export const MOCK_PROCORE_COMPANIES: ProcoreCompany[] = [
  {
    id: 1001,
    name: 'BuildCorp Construction Pty Ltd',
    is_active: true,
    logo_url: undefined,
    entity_type: 'abn',
    entity_id: '12345678901',
  },
  {
    id: 1002,
    name: 'Metro Developments Australia',
    is_active: true,
    logo_url: undefined,
    entity_type: 'abn',
    entity_id: '98765432109',
  },
]

// ============================================================================
// Mock Projects (Australian)
// ============================================================================

export const MOCK_PROCORE_PROJECTS: ProcoreProject[] = [
  {
    id: 100001,
    name: 'Sydney Metro West Station Development',
    display_name: 'SMW-001 - Sydney Metro West Station Development',
    project_number: 'SMW-001',
    address: '500 George Street',
    city: 'Sydney',
    state_code: 'NSW',
    country_code: 'AU',
    zip: '2000',
    latitude: -33.8688,
    longitude: 151.2093,
    description: 'Major underground metro station development in Sydney CBD',
    square_feet: 150000,
    phone: '+61 2 9876 5432',
    public_notes: 'Critical infrastructure project - high security requirements',
    estimated_start_date: '2024-01-15',
    estimated_completion_date: '2027-06-30',
    actual_start_date: '2024-02-01',
    projected_finish_date: '2027-08-30',
    active: true,
    flag: 'Green',
    created_at: '2023-10-01T09:00:00Z',
    updated_at: '2024-01-10T14:30:00Z',
    office: { id: 101, name: 'Sydney CBD Office' },
    project_stage: { id: 2, name: 'Construction' },
    project_type: { id: 5, name: 'Infrastructure' },
    logo_url: null,
  },
  {
    id: 100002,
    name: 'Melbourne South Yarra Apartments',
    display_name: 'MSY-002 - Melbourne South Yarra Apartments',
    project_number: 'MSY-002',
    address: '120 Chapel Street',
    city: 'South Yarra',
    state_code: 'VIC',
    country_code: 'AU',
    zip: '3141',
    latitude: -37.8425,
    longitude: 144.9923,
    description: '25-storey residential apartment complex with retail ground floor',
    square_feet: 85000,
    phone: '+61 3 9543 2100',
    public_notes: null,
    estimated_start_date: '2024-03-01',
    estimated_completion_date: '2026-09-30',
    actual_start_date: null,
    projected_finish_date: null,
    active: true,
    flag: 'Yellow',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T16:45:00Z',
    office: { id: 102, name: 'Melbourne Office' },
    project_stage: { id: 1, name: 'Pre-Construction' },
    project_type: { id: 3, name: 'Residential' },
    logo_url: null,
  },
  {
    id: 100003,
    name: 'Brisbane Airport Terminal Expansion',
    display_name: 'BAT-003 - Brisbane Airport Terminal Expansion',
    project_number: 'BAT-003',
    address: '1 Airport Drive',
    city: 'Brisbane Airport',
    state_code: 'QLD',
    country_code: 'AU',
    zip: '4008',
    latitude: -27.3842,
    longitude: 153.1175,
    description: 'International terminal expansion - Gates 81-95',
    square_feet: 200000,
    phone: '+61 7 3406 1234',
    public_notes: 'Airside work - special access requirements',
    estimated_start_date: '2023-06-01',
    estimated_completion_date: '2025-12-31',
    actual_start_date: '2023-07-15',
    projected_finish_date: '2026-02-28',
    active: true,
    flag: 'Red',
    created_at: '2023-04-01T08:00:00Z',
    updated_at: '2024-01-25T11:20:00Z',
    office: { id: 103, name: 'Brisbane Office' },
    project_stage: { id: 2, name: 'Construction' },
    project_type: { id: 6, name: 'Aviation' },
    logo_url: null,
  },
  {
    id: 100004,
    name: 'Perth CBD Office Tower',
    display_name: 'POT-004 - Perth CBD Office Tower',
    project_number: 'POT-004',
    address: '250 St Georges Terrace',
    city: 'Perth',
    state_code: 'WA',
    country_code: 'AU',
    zip: '6000',
    latitude: -31.9523,
    longitude: 115.8613,
    description: '40-storey premium grade A office building',
    square_feet: 180000,
    phone: '+61 8 9325 6789',
    public_notes: null,
    estimated_start_date: '2024-07-01',
    estimated_completion_date: '2027-12-31',
    actual_start_date: null,
    projected_finish_date: null,
    active: true,
    flag: null,
    created_at: '2024-01-10T14:00:00Z',
    updated_at: '2024-01-10T14:00:00Z',
    office: { id: 104, name: 'Perth Office' },
    project_stage: { id: 0, name: 'Bidding' },
    project_type: { id: 4, name: 'Commercial' },
    logo_url: null,
  },
  {
    id: 100005,
    name: 'Adelaide Hospital Redevelopment',
    display_name: 'AHR-005 - Adelaide Hospital Redevelopment',
    project_number: 'AHR-005',
    address: '55 Frome Road',
    city: 'Adelaide',
    state_code: 'SA',
    country_code: 'AU',
    zip: '5000',
    latitude: -34.9211,
    longitude: 138.5999,
    description: 'Major hospital redevelopment - new surgical wing',
    square_feet: 95000,
    phone: '+61 8 8222 3344',
    public_notes: 'Occupied facility - strict infection control',
    estimated_start_date: '2024-02-01',
    estimated_completion_date: '2026-08-31',
    actual_start_date: '2024-02-15',
    projected_finish_date: null,
    active: true,
    flag: 'Green',
    created_at: '2023-11-01T09:30:00Z',
    updated_at: '2024-01-28T10:15:00Z',
    office: { id: 105, name: 'Adelaide Office' },
    project_stage: { id: 2, name: 'Construction' },
    project_type: { id: 7, name: 'Healthcare' },
    logo_url: null,
  },
]

// ============================================================================
// Mock Vendors (Australian Subcontractors)
// ============================================================================

// Valid Australian ABNs (using checksum algorithm)
const MOCK_ABNS = [
  '51824753556', // Acme Electrical
  '65433221190', // Metro Plumbing
  '28754309126', // SafetyFirst
  '38192846573', // Precision HVAC
  '73429856123', // Concrete Masters
  '84215693748', // Steel Solutions
  '21876543219', // GlazeCorp
  '56789012345', // FireTech Systems
  '90123456789', // Lift Experts
  '45678901234', // FormPro Scaffolding
  '12098765432', // WaterProof Co
  '67890123456', // Cable Connect
]

export const MOCK_PROCORE_VENDORS: ProcoreVendor[] = [
  {
    id: 200001,
    name: 'Acme Electrical Contractors Pty Ltd',
    abbreviated_name: 'ACME-001',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[0],
    license_number: 'EC12345',
    tax_id: null,
    business_id: null,
    email_address: 'info@acmeelectrical.com.au',
    business_phone: '+61 2 9876 5432',
    fax_number: null,
    website: 'https://acmeelectrical.com.au',
    address: '123 Industrial Way',
    city: 'Parramatta',
    state_code: 'NSW',
    country_code: 'AU',
    zip: '2150',
    dba: null,
    is_active: true,
    vendor_group: { id: 10, name: 'Electrical' },
    primary_contact: {
      id: 300001,
      name: 'John Smith',
      email_address: 'john@acmeelectrical.com.au',
      business_phone: '+61 2 9876 5432',
      mobile_phone: '+61 400 123 456',
      is_primary: true,
    },
    created_at: '2022-05-15T10:30:00Z',
    updated_at: '2024-01-08T16:45:00Z',
    erp_vendor_id: null,
  },
  {
    id: 200002,
    name: 'Metro Plumbing Services',
    abbreviated_name: 'MPS-002',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[1],
    license_number: 'PL98765',
    tax_id: null,
    business_id: null,
    email_address: 'admin@metroplumbing.com.au',
    business_phone: '+61 3 9543 2100',
    fax_number: '+61 3 9543 2101',
    website: 'https://metroplumbing.com.au',
    address: '45 Trade Street',
    city: 'Richmond',
    state_code: 'VIC',
    country_code: 'AU',
    zip: '3121',
    dba: 'Metro Plumbers',
    is_active: true,
    vendor_group: { id: 11, name: 'Plumbing' },
    primary_contact: {
      id: 300002,
      name: 'Sarah Johnson',
      email_address: 'sarah@metroplumbing.com.au',
      business_phone: '+61 3 9543 2100',
      mobile_phone: '+61 412 345 678',
      is_primary: true,
    },
    created_at: '2021-03-20T14:00:00Z',
    updated_at: '2024-01-15T09:30:00Z',
    erp_vendor_id: 'ERP-MPL-001',
  },
  {
    id: 200003,
    name: 'SafetyFirst Work Platforms',
    abbreviated_name: 'SF-003',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[2],
    license_number: 'SC45678',
    tax_id: null,
    business_id: null,
    email_address: 'bookings@safetyfirst.com.au',
    business_phone: '+61 7 3234 5678',
    fax_number: null,
    website: 'https://safetyfirst.com.au',
    address: '789 Safety Lane',
    city: 'Eagle Farm',
    state_code: 'QLD',
    country_code: 'AU',
    zip: '4009',
    dba: null,
    is_active: true,
    vendor_group: { id: 12, name: 'Scaffolding' },
    primary_contact: {
      id: 300003,
      name: 'Mike Wilson',
      email_address: 'mike@safetyfirst.com.au',
      business_phone: '+61 7 3234 5678',
      mobile_phone: '+61 423 456 789',
      is_primary: true,
    },
    created_at: '2020-08-10T11:00:00Z',
    updated_at: '2024-01-20T14:20:00Z',
    erp_vendor_id: null,
  },
  {
    id: 200004,
    name: 'Precision HVAC Solutions',
    abbreviated_name: 'PHVAC-004',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[3],
    license_number: 'HVAC-2345',
    tax_id: null,
    business_id: null,
    email_address: 'quotes@precisionhvac.com.au',
    business_phone: '+61 8 9325 6789',
    fax_number: null,
    website: 'https://precisionhvac.com.au',
    address: '12 Air Con Drive',
    city: 'Osborne Park',
    state_code: 'WA',
    country_code: 'AU',
    zip: '6017',
    dba: null,
    is_active: true,
    vendor_group: { id: 13, name: 'HVAC' },
    primary_contact: {
      id: 300004,
      name: 'David Chen',
      email_address: 'david@precisionhvac.com.au',
      business_phone: '+61 8 9325 6789',
      mobile_phone: '+61 434 567 890',
      is_primary: true,
    },
    created_at: '2022-01-05T09:15:00Z',
    updated_at: '2024-01-22T11:45:00Z',
    erp_vendor_id: null,
  },
  {
    id: 200005,
    name: 'Concrete Masters Australia',
    abbreviated_name: 'CMA-005',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[4],
    license_number: null,
    tax_id: null,
    business_id: null,
    email_address: 'office@concretemasters.com.au',
    business_phone: '+61 2 4567 8901',
    fax_number: '+61 2 4567 8902',
    website: null,
    address: '567 Concrete Blvd',
    city: 'Newcastle',
    state_code: 'NSW',
    country_code: 'AU',
    zip: '2300',
    dba: null,
    is_active: true,
    vendor_group: { id: 14, name: 'Concrete' },
    primary_contact: {
      id: 300005,
      name: 'Robert Brown',
      email_address: 'rob@concretemasters.com.au',
      business_phone: '+61 2 4567 8901',
      mobile_phone: '+61 445 678 901',
      is_primary: true,
    },
    created_at: '2019-11-20T16:30:00Z',
    updated_at: '2024-01-18T08:00:00Z',
    erp_vendor_id: 'CMA-NSW-001',
  },
  {
    id: 200006,
    name: 'Steel Solutions Fabrication',
    abbreviated_name: 'SSF-006',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[5],
    license_number: 'SF-7890',
    tax_id: null,
    business_id: null,
    email_address: 'sales@steelsolutions.com.au',
    business_phone: '+61 3 9087 6543',
    fax_number: null,
    website: 'https://steelsolutions.com.au',
    address: '234 Steel Works Road',
    city: 'Dandenong South',
    state_code: 'VIC',
    country_code: 'AU',
    zip: '3175',
    dba: 'Steel Solutions',
    is_active: true,
    vendor_group: { id: 15, name: 'Structural Steel' },
    primary_contact: {
      id: 300006,
      name: 'Lisa Nguyen',
      email_address: 'lisa@steelsolutions.com.au',
      business_phone: '+61 3 9087 6543',
      mobile_phone: '+61 456 789 012',
      is_primary: true,
    },
    created_at: '2021-06-15T13:45:00Z',
    updated_at: '2024-01-25T15:30:00Z',
    erp_vendor_id: null,
  },
  {
    id: 200007,
    name: 'GlazeCorp Commercial Glazing',
    abbreviated_name: 'GC-007',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[6],
    license_number: 'GLZ-1234',
    tax_id: null,
    business_id: null,
    email_address: 'projects@glazecorp.com.au',
    business_phone: '+61 7 3098 7654',
    fax_number: null,
    website: 'https://glazecorp.com.au',
    address: '890 Glass Street',
    city: 'Woolloongabba',
    state_code: 'QLD',
    country_code: 'AU',
    zip: '4102',
    dba: null,
    is_active: true,
    vendor_group: { id: 16, name: 'Glazing' },
    primary_contact: {
      id: 300007,
      name: 'James Taylor',
      email_address: 'james@glazecorp.com.au',
      business_phone: '+61 7 3098 7654',
      mobile_phone: '+61 467 890 123',
      is_primary: true,
    },
    created_at: '2022-09-01T10:00:00Z',
    updated_at: '2024-01-12T17:15:00Z',
    erp_vendor_id: null,
  },
  {
    id: 200008,
    name: 'FireTech Systems Pty Ltd',
    abbreviated_name: 'FTS-008',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[7],
    license_number: 'FP-5678',
    tax_id: null,
    business_id: null,
    email_address: 'enquiries@firetech.com.au',
    business_phone: '+61 8 8234 5678',
    fax_number: null,
    website: 'https://firetech.com.au',
    address: '345 Fire Safety Ave',
    city: 'Thebarton',
    state_code: 'SA',
    country_code: 'AU',
    zip: '5031',
    dba: null,
    is_active: true,
    vendor_group: { id: 17, name: 'Fire Protection' },
    primary_contact: {
      id: 300008,
      name: 'Emma White',
      email_address: 'emma@firetech.com.au',
      business_phone: '+61 8 8234 5678',
      mobile_phone: '+61 478 901 234',
      is_primary: true,
    },
    created_at: '2021-12-10T14:30:00Z',
    updated_at: '2024-01-28T09:45:00Z',
    erp_vendor_id: null,
  },
  {
    id: 200009,
    name: 'Lift Experts Australia',
    abbreviated_name: 'LEA-009',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[8],
    license_number: 'LIFT-9012',
    tax_id: null,
    business_id: null,
    email_address: 'service@liftexperts.com.au',
    business_phone: '+61 2 8765 4321',
    fax_number: null,
    website: 'https://liftexperts.com.au',
    address: '678 Elevator Lane',
    city: 'Alexandria',
    state_code: 'NSW',
    country_code: 'AU',
    zip: '2015',
    dba: 'Lift Experts',
    is_active: true,
    vendor_group: { id: 18, name: 'Vertical Transportation' },
    primary_contact: {
      id: 300009,
      name: 'Michael Lee',
      email_address: 'michael@liftexperts.com.au',
      business_phone: '+61 2 8765 4321',
      mobile_phone: '+61 489 012 345',
      is_primary: true,
    },
    created_at: '2020-04-25T11:20:00Z',
    updated_at: '2024-01-05T16:00:00Z',
    erp_vendor_id: 'LEA-SYD-001',
  },
  {
    id: 200010,
    name: 'FormPro Scaffolding Services',
    abbreviated_name: 'FPS-010',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[9],
    license_number: 'SCF-3456',
    tax_id: null,
    business_id: null,
    email_address: 'hire@formpro.com.au',
    business_phone: '+61 3 9456 7890',
    fax_number: null,
    website: 'https://formpro.com.au',
    address: '901 Scaffold Street',
    city: 'Tullamarine',
    state_code: 'VIC',
    country_code: 'AU',
    zip: '3043',
    dba: null,
    is_active: true,
    vendor_group: { id: 12, name: 'Scaffolding' },
    primary_contact: {
      id: 300010,
      name: 'Peter Garcia',
      email_address: 'peter@formpro.com.au',
      business_phone: '+61 3 9456 7890',
      mobile_phone: '+61 490 123 456',
      is_primary: true,
    },
    created_at: '2022-03-15T08:45:00Z',
    updated_at: '2024-01-30T12:30:00Z',
    erp_vendor_id: null,
  },
  // Vendor without ABN (international or missing)
  {
    id: 200011,
    name: 'Global Equipment Imports LLC',
    abbreviated_name: 'GEI-011',
    entity_type: null,
    entity_id: null,
    license_number: null,
    tax_id: 'US-123456789',
    business_id: null,
    email_address: 'orders@globalequipment.com',
    business_phone: '+1 555 123 4567',
    fax_number: null,
    website: 'https://globalequipment.com',
    address: '1234 Import Way',
    city: 'Los Angeles',
    state_code: 'CA',
    country_code: 'US',
    zip: '90001',
    dba: null,
    is_active: true,
    vendor_group: { id: 19, name: 'Equipment Suppliers' },
    primary_contact: {
      id: 300011,
      name: 'Tom Anderson',
      email_address: 'tom@globalequipment.com',
      business_phone: '+1 555 123 4567',
      mobile_phone: null,
      is_primary: true,
    },
    created_at: '2023-06-20T09:00:00Z',
    updated_at: '2024-01-15T14:00:00Z',
    erp_vendor_id: null,
  },
  // Inactive vendor
  {
    id: 200012,
    name: 'Defunct Contractors (Closed)',
    abbreviated_name: 'DC-012',
    entity_type: 'abn',
    entity_id: MOCK_ABNS[10],
    license_number: null,
    tax_id: null,
    business_id: null,
    email_address: null,
    business_phone: null,
    fax_number: null,
    website: null,
    address: null,
    city: null,
    state_code: null,
    country_code: 'AU',
    zip: null,
    dba: null,
    is_active: false,
    vendor_group: null,
    primary_contact: null,
    created_at: '2018-01-01T00:00:00Z',
    updated_at: '2023-12-01T00:00:00Z',
    erp_vendor_id: null,
  },
]

// ============================================================================
// Mock OAuth Tokens
// ============================================================================

export function createMockOAuthTokens(): ProcoreOAuthTokens {
  return {
    access_token: `mock_access_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    refresh_token: `mock_refresh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    token_type: 'Bearer',
    expires_in: 7200, // 2 hours
    created_at: Math.floor(Date.now() / 1000),
  }
}

// ============================================================================
// Mock Webhook Events
// ============================================================================

export function createMockWebhookEvent(
  resourceName: string,
  resourceId: number,
  eventType: 'create' | 'update' | 'delete',
  companyId: number = 1001,
  projectId: number | null = null
): ProcoreWebhookEvent {
  return {
    id: `01${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    resource_name: resourceName,
    resource_id: resourceId,
    event_type: eventType,
    company_id: companyId,
    project_id: projectId,
    api_version: 'v2',
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get mock projects for a company
 */
export function getMockProjects(
  companyId: number,
  options: { page?: number; perPage?: number; active?: boolean } = {}
): ProcoreProject[] {
  const { page = 1, perPage = 100, active } = options

  let projects = [...MOCK_PROCORE_PROJECTS]

  if (active !== undefined) {
    projects = projects.filter(p => p.active === active)
  }

  const start = (page - 1) * perPage
  const end = start + perPage

  return projects.slice(start, end)
}

/**
 * Get mock vendors for a company
 */
export function getMockVendors(
  companyId: number,
  options: { page?: number; perPage?: number; isActive?: boolean; vendorGroupId?: number } = {}
): ProcoreVendor[] {
  const { page = 1, perPage = 100, isActive, vendorGroupId } = options

  let vendors = [...MOCK_PROCORE_VENDORS]

  if (isActive !== undefined) {
    vendors = vendors.filter(v => v.is_active === isActive)
  }

  if (vendorGroupId !== undefined) {
    vendors = vendors.filter(v => v.vendor_group?.id === vendorGroupId)
  }

  const start = (page - 1) * perPage
  const end = start + perPage

  return vendors.slice(start, end)
}

/**
 * Get a single mock project by ID
 */
export function getMockProject(projectId: number): ProcoreProject | null {
  return MOCK_PROCORE_PROJECTS.find(p => p.id === projectId) || null
}

/**
 * Get a single mock vendor by ID
 */
export function getMockVendor(vendorId: number): ProcoreVendor | null {
  return MOCK_PROCORE_VENDORS.find(v => v.id === vendorId) || null
}

/**
 * Simulate API delay for realism
 */
export function mockApiDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise(resolve => setTimeout(resolve, delay))
}
