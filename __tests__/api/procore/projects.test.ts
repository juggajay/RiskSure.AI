/**
 * Procore Projects API Tests
 *
 * Tests for GET /api/procore/projects endpoint.
 * Uses mocked dependencies to test handler logic.
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
    if (token === 'viewer-token') {
      return {
        id: 'user-2',
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

jest.mock('@/lib/procore', () => ({
  createProcoreClient: jest.fn(() => ({
    getProjects: jest.fn().mockResolvedValue({
      data: [
        {
          id: 2001,
          name: 'Project Alpha',
          display_name: 'Project Alpha',
          project_number: 'P-001',
          active: true,
          state_code: 'NSW',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 2002,
          name: 'Project Beta',
          display_name: 'Project Beta',
          project_number: 'P-002',
          active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      hasMore: false,
      total: 2,
    }),
    getCompanyId: jest.fn().mockReturnValue(1001),
  })),
}))

// Now import Next.js modules after all mocks are set up
import { NextRequest, NextResponse } from 'next/server'

describe('GET /api/procore/projects', () => {
  // Dynamically import the route handler after mocks are set up
  let GET: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const module = await import('@/app/api/procore/projects/route')
    GET = module.GET
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  function createRequest(params: Record<string, string> = {}) {
    const url = new URL('http://localhost/api/procore/projects')
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    return new NextRequest(url)
  }

  it('should return projects when authenticated as admin', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        procoreCompanyName: 'Test Company',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([
        {
          procoreCompanyId: 1001,
          procoreEntityType: 'project',
          procoreEntityId: 2001,
          shieldEntityId: 'shield-project-1',
        },
      ])

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.projects).toHaveLength(2)
    expect(data.projects[0].syncStatus).toBe('synced')
    expect(data.projects[1].syncStatus).toBe('not_synced')
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

  it('should return 403 for non-admin users', async () => {
    const { cookies } = require('next/headers')
    cookies.mockResolvedValueOnce({
      get: jest.fn(() => ({ value: 'viewer-token' })),
    })

    const request = createRequest()
    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('should return 404 when Procore not connected', async () => {
    mockConvexQuery.mockResolvedValueOnce(null)

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.needsConnection).toBe(true)
  })

  it('should return 400 when company not selected', async () => {
    mockConvexQuery.mockResolvedValueOnce({
      accessToken: 'token',
      pendingCompanySelection: true,
      procoreCompanyId: null,
    })

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.needsCompanySelection).toBe(true)
  })

  it('should handle pagination parameters', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([])

    const request = createRequest({ page: '2', per_page: '50' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.page).toBe(2)
    expect(data.pagination.perPage).toBe(50)
  })

  it('should include sync status for each project', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        procoreCompanyName: 'Test Company',
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([
        {
          procoreCompanyId: 1001,
          procoreEntityType: 'project',
          procoreEntityId: 2001,
          shieldEntityId: 'shield-project-1',
        },
      ])

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const syncedProject = data.projects.find((p: { id: number }) => p.id === 2001)
    const notSyncedProject = data.projects.find((p: { id: number }) => p.id === 2002)

    expect(syncedProject.syncStatus).toBe('synced')
    expect(syncedProject.shieldProjectId).toBe('shield-project-1')
    expect(notSyncedProject.syncStatus).toBe('not_synced')
  })

  it('should include Procore company info in response', async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        procoreCompanyId: 1001,
        procoreCompanyName: 'Acme Construction',
        accessToken: 'token',
        pendingCompanySelection: false,
      })
      .mockResolvedValueOnce([])

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.procoreCompany.id).toBe(1001)
    expect(data.procoreCompany.name).toBe('Acme Construction')
  })
})
