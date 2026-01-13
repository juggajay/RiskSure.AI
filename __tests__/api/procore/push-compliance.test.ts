/**
 * Procore Push Compliance API Tests
 *
 * Tests for POST and GET /api/procore/push-compliance endpoint.
 *
 * @jest-environment node
 */

// Create mock functions at module scope
const mockConvexQuery = jest.fn()
const mockConvexMutation = jest.fn()
const mockPushComplianceToProcoreConvex = jest.fn()
const mockGetCompliancePushHistoryConvex = jest.fn()
const mockCookiesGet = jest.fn()

// Mock dependencies before imports
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: (name: string) => mockCookiesGet(name),
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

jest.mock('convex/browser', () => ({
  ConvexHttpClient: jest.fn().mockImplementation(() => ({
    query: (...args: unknown[]) => mockConvexQuery(...args),
    mutation: (...args: unknown[]) => mockConvexMutation(...args),
  })),
}))

jest.mock('@/lib/procore/hooks-convex', () => ({
  pushComplianceToProcoreConvex: (...args: unknown[]) => mockPushComplianceToProcoreConvex(...args),
  getCompliancePushHistoryConvex: (...args: unknown[]) => mockGetCompliancePushHistoryConvex(...args),
}))

// Now import Next.js modules after all mocks are set up
import { NextRequest, NextResponse } from 'next/server'

describe('POST /api/procore/push-compliance', () => {
  let POST: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const module = await import('@/app/api/procore/push-compliance/route')
    POST = module.POST
  })

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    // Default to valid auth token
    mockCookiesGet.mockImplementation((name: string) => {
      if (name === 'auth_token') {
        return { value: 'valid-test-token' }
      }
      return undefined
    })
  })

  function createPostRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/procore/push-compliance', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should push compliance successfully', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        _id: 'sub-123',
        name: 'Test Subcontractor',
        companyId: 'company-123',
      })

    mockPushComplianceToProcoreConvex.mockResolvedValue({
      pushed: true,
      message: 'Compliance status "compliant" pushed to Procore',
      procoreVendorId: 3001,
    })

    const request = createPostRequest({
      subcontractorId: 'sub-123',
      verificationId: 'verification-456',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.procoreVendorId).toBe(3001)
  })

  it('should return 401 when not authenticated', async () => {
    mockCookiesGet.mockImplementation(() => undefined)

    const request = createPostRequest({ subcontractorId: 'sub-123' })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should return 403 for non-admin users', async () => {
    mockCookiesGet.mockImplementation((name: string) => {
      if (name === 'auth_token') {
        return { value: 'viewer-token' }
      }
      return undefined
    })

    const request = createPostRequest({ subcontractorId: 'sub-123' })
    const response = await POST(request)

    expect(response.status).toBe(403)
  })

  it('should allow risk_manager role', async () => {
    mockCookiesGet.mockImplementation((name: string) => {
      if (name === 'auth_token') {
        return { value: 'risk-manager-token' }
      }
      return undefined
    })

    mockConvexQuery
      .mockResolvedValueOnce({
        _id: 'sub-123',
        companyId: 'company-123',
      })
      .mockResolvedValueOnce({
        _id: 'verification-123',
        status: 'pass',
      })

    mockPushComplianceToProcoreConvex.mockResolvedValue({
      pushed: true,
      message: 'Pushed successfully',
    })

    const request = createPostRequest({ subcontractorId: 'sub-123' })
    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should return 400 when subcontractorId missing', async () => {
    const request = createPostRequest({})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('subcontractorId')
  })

  it('should return 404 when subcontractor not found', async () => {
    mockConvexQuery.mockResolvedValueOnce(null)

    const request = createPostRequest({ subcontractorId: 'not-found' })
    const response = await POST(request)

    expect(response.status).toBe(404)
  })

  it('should return 403 when subcontractor belongs to different company', async () => {
    mockConvexQuery.mockResolvedValueOnce({
      _id: 'sub-123',
      companyId: 'different-company',
    })

    const request = createPostRequest({ subcontractorId: 'sub-123' })
    const response = await POST(request)

    expect(response.status).toBe(403)
  })

  it('should get latest verification when verificationId not provided', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        _id: 'sub-123',
        companyId: 'company-123',
      })
      .mockResolvedValueOnce({
        _id: 'latest-verification',
        status: 'pass',
      })

    mockPushComplianceToProcoreConvex.mockResolvedValue({
      pushed: true,
      message: 'Pushed',
    })

    const request = createPostRequest({ subcontractorId: 'sub-123' })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockPushComplianceToProcoreConvex).toHaveBeenCalledWith(
      expect.anything(),
      'company-123',
      'sub-123',
      'latest-verification'
    )
  })

  it('should return 404 when no verifications found', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        _id: 'sub-123',
        companyId: 'company-123',
      })
      .mockResolvedValueOnce(null)

    const request = createPostRequest({ subcontractorId: 'sub-123' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('No verifications found')
  })

  it('should return 400 when push fails', async () => {
    mockConvexQuery.mockResolvedValueOnce({
      _id: 'sub-123',
      companyId: 'company-123',
    })

    mockPushComplianceToProcoreConvex.mockResolvedValue({
      pushed: false,
      message: 'Procore not connected',
    })

    const request = createPostRequest({
      subcontractorId: 'sub-123',
      verificationId: 'ver-123',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})

describe('GET /api/procore/push-compliance', () => {
  let GET: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const module = await import('@/app/api/procore/push-compliance/route')
    GET = module.GET
  })

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    // Default to valid auth token
    mockCookiesGet.mockImplementation((name: string) => {
      if (name === 'auth_token') {
        return { value: 'valid-test-token' }
      }
      return undefined
    })
  })

  function createGetRequest(params: Record<string, string> = {}) {
    const url = new URL('http://localhost/api/procore/push-compliance')
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    return new NextRequest(url)
  }

  it('should return compliance push history', async () => {
    mockConvexQuery.mockResolvedValueOnce({
      _id: 'sub-123',
      companyId: 'company-123',
    })

    mockGetCompliancePushHistoryConvex.mockResolvedValue([
      {
        id: 'log-1',
        action: 'procore_compliance_push',
        details: { compliance_status: 'compliant' },
        created_at: Date.now(),
      },
      {
        id: 'log-2',
        action: 'procore_compliance_push_failed',
        details: { error: 'Connection failed' },
        created_at: Date.now() - 86400000,
      },
    ])

    const request = createGetRequest({ subcontractorId: 'sub-123' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.history).toHaveLength(2)
    expect(data.history[0].action).toBe('procore_compliance_push')
  })

  it('should return 401 when not authenticated', async () => {
    mockCookiesGet.mockImplementation(() => undefined)

    const request = createGetRequest({ subcontractorId: 'sub-123' })
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should return 400 when subcontractorId missing', async () => {
    const request = createGetRequest({})
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('subcontractorId')
  })

  it('should return 404 when subcontractor not found', async () => {
    mockConvexQuery.mockResolvedValueOnce(null)

    const request = createGetRequest({ subcontractorId: 'not-found' })
    const response = await GET(request)

    expect(response.status).toBe(404)
  })

  it('should return 403 when subcontractor belongs to different company', async () => {
    mockConvexQuery.mockResolvedValueOnce({
      _id: 'sub-123',
      companyId: 'different-company',
    })

    const request = createGetRequest({ subcontractorId: 'sub-123' })
    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('should return empty history when no pushes', async () => {
    mockConvexQuery.mockResolvedValueOnce({
      _id: 'sub-123',
      companyId: 'company-123',
    })

    mockGetCompliancePushHistoryConvex.mockResolvedValue([])

    const request = createGetRequest({ subcontractorId: 'sub-123' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.history).toHaveLength(0)
  })
})
