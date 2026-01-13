/**
 * Procore Vendors API Tests
 *
 * Tests for GET /api/procore/vendors endpoint.
 *
 * @jest-environment node
 */

// Mock dependencies before imports
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn((name: string) => {
      if (name === 'auth_token') {
        return { value: 'valid-test-token' }
      }
      return undefined
    }),
  })),
}))

jest.mock('@/lib/auth', () => ({
  getUserByToken: jest.fn((token: string) => {
    if (token === 'valid-test-token') {
      return {
        id: 'user-1',
        email: 'admin@test.com',
        role: 'admin',
        company_id: 'company-123',
      }
    }
    if (token === 'risk-manager-token') {
      return {
        id: 'user-2',
        email: 'rm@test.com',
        role: 'risk_manager',
        company_id: 'company-123',
      }
    }
    if (token === 'viewer-token') {
      return {
        id: 'user-3',
        email: 'viewer@test.com',
        role: 'viewer',
        company_id: 'company-123',
      }
    }
    return null
  }),
}))

const mockConvexQuery = jest.fn()
const mockConvexMutation = jest.fn()

jest.mock('convex/browser', () => ({
  ConvexHttpClient: jest.fn().mockImplementation(() => ({
    query: mockConvexQuery,
    mutation: mockConvexMutation,
  })),
}))

const mockGetVendors = jest.fn()
const mockGetProjectVendors = jest.fn()

jest.mock('@/lib/procore', () => ({
  createProcoreClient: jest.fn(() => ({
    getVendors: mockGetVendors,
    getProjectVendors: mockGetProjectVendors,
    getCompanyId: jest.fn().mockReturnValue(1001),
  })),
  extractABNFromVendor: jest.fn((vendor: { entity_type?: string; entity_id?: string }) => {
    if (vendor.entity_type === 'abn' && vendor.entity_id) {
      return vendor.entity_id
    }
    return null
  }),
}))

// Now import Next.js modules after all mocks are set up
import { NextRequest, NextResponse } from 'next/server'

describe('GET /api/procore/vendors', () => {
  let GET: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const module = await import('@/app/api/procore/vendors/route')
    GET = module.GET
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock for getVendors
    mockGetVendors.mockResolvedValue({
      data: [
        {
          id: 3001,
          name: 'Vendor One Pty Ltd',
          entity_type: 'abn',
          entity_id: '12345678901',
          is_active: true,
          email_address: 'vendor1@test.com',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 3002,
          name: 'Vendor Two Pty Ltd',
          entity_type: null,
          entity_id: null,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 3003,
          name: 'Vendor Three',
          entity_type: 'abn',
          entity_id: '98765432109',
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      hasMore: false,
      total: 3,
    })
  })

  function createRequest(params: Record<string, string> = {}) {
    const url = new URL('http://localhost/api/procore/vendors')
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    return new NextRequest(url)
  }

  it('should return vendors when authenticated as admin', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        procoreCompanyName: 'Test Company',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([]) // No existing mappings
      .mockResolvedValueOnce([]) // No ABN conflicts

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.vendors).toHaveLength(3)
    expect(data.stats.total).toBe(3)
  })

  it('should allow risk_manager role', async () => {
    const { cookies } = require('next/headers')
    cookies.mockResolvedValueOnce({
      get: jest.fn(() => ({ value: 'risk-manager-token' })),
    })

    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const request = createRequest()
    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should return 403 for viewer role', async () => {
    const { cookies } = require('next/headers')
    cookies.mockResolvedValueOnce({
      get: jest.fn(() => ({ value: 'viewer-token' })),
    })

    const request = createRequest()
    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('should return 401 when not authenticated', async () => {
    const { cookies } = require('next/headers')
    cookies.mockResolvedValueOnce({
      get: jest.fn(() => undefined),
    })

    const request = createRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should return 404 when Procore not connected', async () => {
    mockConvexQuery.mockResolvedValueOnce(null)

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.needsConnection).toBe(true)
  })

  it('should include ABN extraction in response', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const vendorWithABN = data.vendors.find((v: { id: number }) => v.id === 3001)
    const vendorWithoutABN = data.vendors.find((v: { id: number }) => v.id === 3002)

    expect(vendorWithABN.extractedABN).toBe('12345678901')
    expect(vendorWithoutABN.extractedABN).toBeNull()
  })

  it('should detect ABN conflicts with existing subcontractors', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([]) // No existing mappings
      .mockResolvedValueOnce([
        { _id: 'existing-sub-1', name: 'Existing Sub', abn: '12345678901' },
      ])

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const conflictVendor = data.vendors.find((v: { id: number }) => v.id === 3001)
    expect(conflictVendor.syncStatus).toBe('abn_conflict')
    expect(conflictVendor.conflictDetails.existingName).toBe('Existing Sub')
  })

  it('should mark synced vendors correctly', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([
        {
          procoreCompanyId: 1001,
          procoreEntityType: 'vendor',
          procoreEntityId: 3001,
          shieldEntityId: 'shield-sub-1',
        },
      ])
      .mockResolvedValueOnce([])

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const syncedVendor = data.vendors.find((v: { id: number }) => v.id === 3001)
    expect(syncedVendor.syncStatus).toBe('synced')
    expect(syncedVendor.shieldSubcontractorId).toBe('shield-sub-1')
  })

  it('should include stats in response', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([
        {
          procoreCompanyId: 1001,
          procoreEntityType: 'vendor',
          procoreEntityId: 3001,
          shieldEntityId: 'shield-sub-1',
        },
      ])
      .mockResolvedValueOnce([])

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats).toHaveProperty('total')
    expect(data.stats).toHaveProperty('synced')
    expect(data.stats).toHaveProperty('notSynced')
    expect(data.stats).toHaveProperty('abnConflicts')
    expect(data.stats).toHaveProperty('withABN')
    expect(data.stats).toHaveProperty('withoutABN')
  })

  it('should handle project_id filter', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockGetProjectVendors.mockResolvedValue({
      data: [
        {
          id: 3001,
          name: 'Project Vendor',
          entity_type: 'abn',
          entity_id: '12345678901',
          is_active: true,
        },
      ],
      hasMore: false,
      total: 1,
    })

    const request = createRequest({ project_id: '2001' })
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockGetProjectVendors).toHaveBeenCalledWith(2001, expect.any(Object))
  })

  it('should handle pagination parameters', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const request = createRequest({ page: '2', per_page: '25' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.page).toBe(2)
    expect(data.pagination.perPage).toBe(25)
  })

  it('should filter by active status', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const request = createRequest({ active: 'true' })
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockGetVendors).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true })
    )
  })
})
