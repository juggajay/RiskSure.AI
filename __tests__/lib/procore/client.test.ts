/**
 * Procore Client Tests
 *
 * Tests for the ProcoreClient class including API calls, pagination,
 * token refresh, and error handling.
 */

import {
  ProcoreClient,
  createProcoreClient,
  createMockProcoreClient,
} from '@/lib/procore/client'

// Mock the config module
jest.mock('@/lib/procore/config', () => ({
  getProcoreConfig: jest.fn(() => ({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://app.test.com/callback',
    apiBaseUrl: 'https://api.procore.com',
    authorizationUrl: 'https://login.procore.com/oauth/authorize',
    tokenUrl: 'https://login.procore.com/oauth/token',
    isSandbox: false,
    isDevMode: true, // Default to dev mode for tests
  })),
  isProcoreDevMode: jest.fn(() => true),
  PROCORE_RATE_LIMITS: {
    requestsPerHour: 3600,
    maxRetries: 3,
    backoffMultiplier: 2,
    retryAfterMs: 1000,
  },
  PROCORE_PAGINATION: {
    defaultPageSize: 100,
    maxPageSize: 1000,
  },
}))

// Mock the mock-data module
jest.mock('@/lib/procore/mock-data', () => ({
  MOCK_PROCORE_COMPANIES: [
    { id: 1001, name: 'Test Company 1', is_active: true },
    { id: 1002, name: 'Test Company 2', is_active: true },
  ],
  getMockProjects: jest.fn((companyId: number, options?: { page?: number; perPage?: number }) => {
    const allProjects = [
      { id: 2001, name: 'Project Alpha', display_name: 'Project Alpha', project_number: 'P-001', active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 2002, name: 'Project Beta', display_name: 'Project Beta', project_number: 'P-002', active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 2003, name: 'Project Gamma', display_name: 'Project Gamma', project_number: 'P-003', active: false, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]
    if (options?.page && options?.perPage) {
      const start = (options.page - 1) * options.perPage
      return allProjects.slice(start, start + options.perPage)
    }
    return allProjects
  }),
  getMockVendors: jest.fn((companyId: number, options?: { page?: number; perPage?: number; isActive?: boolean }) => {
    let vendors = [
      { id: 3001, name: 'Vendor One', entity_type: 'abn', entity_id: '12345678901', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 3002, name: 'Vendor Two', entity_type: null, entity_id: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 3003, name: 'Vendor Three', entity_type: 'abn', entity_id: '98765432109', is_active: false, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]
    if (options?.isActive !== undefined) {
      vendors = vendors.filter(v => v.is_active === options.isActive)
    }
    if (options?.page && options?.perPage) {
      const start = (options.page - 1) * options.perPage
      return vendors.slice(start, start + options.perPage)
    }
    return vendors
  }),
  getMockProject: jest.fn((projectId: number) => {
    const projects: Record<number, unknown> = {
      2001: { id: 2001, name: 'Project Alpha', display_name: 'Project Alpha', project_number: 'P-001', active: true },
    }
    return projects[projectId] || null
  }),
  getMockVendor: jest.fn((vendorId: number) => {
    const vendors: Record<number, unknown> = {
      3001: { id: 3001, name: 'Vendor One', entity_type: 'abn', entity_id: '12345678901', is_active: true },
    }
    return vendors[vendorId] || null
  }),
  createMockOAuthTokens: jest.fn(() => ({
    access_token: 'mock-access-token-refreshed',
    refresh_token: 'mock-refresh-token-refreshed',
    token_type: 'Bearer',
    expires_in: 7200,
    created_at: Math.floor(Date.now() / 1000),
  })),
  mockApiDelay: jest.fn(() => Promise.resolve()),
}))

describe('ProcoreClient', () => {
  let client: ProcoreClient

  beforeEach(() => {
    jest.clearAllMocks()
    client = createProcoreClient({
      companyId: 1001,
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    })
  })

  describe('constructor', () => {
    it('should create client with provided options', () => {
      expect(client.getCompanyId()).toBe(1001)
      expect(client.isInDevMode()).toBe(true)
    })

    it('should create client via createProcoreClient factory', () => {
      const factoryClient = createProcoreClient({
        companyId: 2002,
        accessToken: 'factory-access-token',
        refreshToken: 'factory-refresh-token',
      })
      expect(factoryClient.getCompanyId()).toBe(2002)
    })

    it('should create mock client via createMockProcoreClient', () => {
      const mockClient = createMockProcoreClient(3003)
      expect(mockClient.getCompanyId()).toBe(3003)
      expect(mockClient.isInDevMode()).toBe(true)
    })
  })

  describe('getCompanies', () => {
    it('should return mock companies in dev mode', async () => {
      const companies = await client.getCompanies()
      expect(companies).toHaveLength(2)
      expect(companies[0].id).toBe(1001)
      expect(companies[0].name).toBe('Test Company 1')
    })
  })

  describe('getProjects', () => {
    it('should return paginated projects', async () => {
      const response = await client.getProjects({ page: 1, per_page: 10 })
      expect(response.data).toHaveLength(3)
      expect(response.data[0].name).toBe('Project Alpha')
    })

    it('should handle pagination metadata', async () => {
      const response = await client.getProjects({ page: 1, per_page: 2 })
      expect(response.hasMore).toBe(true)
      expect(response.nextPage).toBe(2)
    })
  })

  describe('getAllProjects', () => {
    it('should retrieve all projects handling pagination', async () => {
      const projects = await client.getAllProjects()
      expect(projects.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('getProject', () => {
    it('should return project by ID', async () => {
      const project = await client.getProject(2001)
      expect(project).not.toBeNull()
      expect(project?.name).toBe('Project Alpha')
    })

    it('should return null for non-existent project', async () => {
      const project = await client.getProject(9999)
      expect(project).toBeNull()
    })
  })

  describe('getVendors', () => {
    it('should return paginated vendors', async () => {
      const response = await client.getVendors({ page: 1, per_page: 10 })
      expect(response.data).toHaveLength(3)
      expect(response.data[0].name).toBe('Vendor One')
    })

    it('should filter vendors by isActive', async () => {
      const response = await client.getVendors({ isActive: true })
      expect(response.data.every(v => v.is_active)).toBe(true)
    })
  })

  describe('getAllVendors', () => {
    it('should retrieve all vendors', async () => {
      const vendors = await client.getAllVendors()
      expect(vendors.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter by active status', async () => {
      const vendors = await client.getAllVendors({ isActive: true })
      expect(vendors.every(v => v.is_active)).toBe(true)
    })
  })

  describe('getVendor', () => {
    it('should return vendor by ID', async () => {
      const vendor = await client.getVendor(3001)
      expect(vendor).not.toBeNull()
      expect(vendor?.name).toBe('Vendor One')
    })

    it('should return null for non-existent vendor', async () => {
      const vendor = await client.getVendor(9999)
      expect(vendor).toBeNull()
    })
  })

  describe('refreshAccessToken', () => {
    it('should refresh tokens in dev mode', async () => {
      const onTokenRefresh = jest.fn()
      const clientWithCallback = createProcoreClient({
        companyId: 1001,
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        onTokenRefresh,
      })

      const tokens = await clientWithCallback.refreshAccessToken()
      expect(tokens.access_token).toBe('mock-access-token-refreshed')
      expect(tokens.refresh_token).toBe('mock-refresh-token-refreshed')
      expect(onTokenRefresh).toHaveBeenCalledWith(tokens)
    })
  })

  describe('testConnection', () => {
    it('should return success in dev mode', async () => {
      const result = await client.testConnection()
      expect(result.success).toBe(true)
      expect(result.message).toContain('DEV MODE')
    })
  })

  describe('updateVendorCustomFields', () => {
    it('should update vendor custom fields in dev mode', async () => {
      const vendor = await client.updateVendorCustomFields(3001, {
        shield_compliance_status: 'compliant',
        shield_last_verified: '2024-01-15T00:00:00Z',
      })
      expect(vendor.id).toBe(3001)
      expect(vendor.custom_fields).toEqual({
        shield_compliance_status: 'compliant',
        shield_last_verified: '2024-01-15T00:00:00Z',
      })
    })

    it('should throw for non-existent vendor', async () => {
      await expect(
        client.updateVendorCustomFields(9999, { test: 'value' })
      ).rejects.toThrow('Vendor 9999 not found')
    })
  })

  describe('Vendor Insurances API', () => {
    describe('getVendorInsurances', () => {
      it('should return mock insurances for vendor', async () => {
        const insurances = await client.getVendorInsurances(3001)
        expect(insurances).toHaveLength(2)
        expect(insurances[0].insurance_type).toBe('General Liability')
        expect(insurances[1].insurance_type).toBe('Workers Compensation')
      })
    })

    describe('createVendorInsurance', () => {
      it('should create insurance record in dev mode', async () => {
        const insurance = await client.createVendorInsurance({
          vendor_id: 3001,
          insurance_type: 'Professional Liability',
          policy_number: 'PL-001',
          limit: 5000000,
        })
        expect(insurance.vendor_id).toBe(3001)
        expect(insurance.insurance_type).toBe('Professional Liability')
        expect(insurance.policy_number).toBe('PL-001')
      })
    })

    describe('updateVendorInsurance', () => {
      it('should update insurance record in dev mode', async () => {
        const insurance = await client.updateVendorInsurance(1001, {
          vendor_id: 3001,
          status: 'compliant',
          expiration_date: '2025-12-31',
        })
        expect(insurance.id).toBe(1001)
        expect(insurance.status).toBe('compliant')
      })
    })

    describe('deleteVendorInsurance', () => {
      it('should delete insurance record in dev mode', async () => {
        await expect(client.deleteVendorInsurance(1001)).resolves.toBeUndefined()
      })
    })

    describe('syncVendorInsurances', () => {
      it('should sync insurance records', async () => {
        const result = await client.syncVendorInsurances(3001, [
          { vendor_id: 3001, insurance_type: 'General Liability', status: 'compliant' },
          { vendor_id: 3001, insurance_type: 'Auto Liability', status: 'compliant' },
        ])

        // First should update (exists), second should create (new type)
        expect(result.updated).toBe(1)
        expect(result.created).toBe(1)
        expect(result.errors).toHaveLength(0)
      })
    })
  })

  describe('getProjectVendors', () => {
    it('should return vendors assigned to project', async () => {
      const response = await client.getProjectVendors(2001)
      expect(response.data.length).toBeGreaterThan(0)
    })
  })

  describe('utility methods', () => {
    it('getCompanyId should return company ID', () => {
      expect(client.getCompanyId()).toBe(1001)
    })

    it('isInDevMode should return dev mode status', () => {
      expect(client.isInDevMode()).toBe(true)
    })
  })
})
