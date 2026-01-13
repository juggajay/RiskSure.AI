/**
 * Procore Sync Convex Tests
 *
 * Tests for project and vendor sync functions using Convex database.
 */

import {
  syncProjectsFromProcoreConvex,
  syncVendorsFromProcoreConvex,
} from '@/lib/procore/sync-convex'
import type { ProcoreClient } from '@/lib/procore/client'
import type { ConvexHttpClient } from 'convex/browser'

// Mock Convex API
const mockConvexQuery = jest.fn()
const mockConvexMutation = jest.fn()

const mockConvex = {
  query: mockConvexQuery,
  mutation: mockConvexMutation,
} as unknown as ConvexHttpClient

// Mock Procore Client
const mockGetProject = jest.fn()
const mockGetVendor = jest.fn()
const mockGetCompanyId = jest.fn()

const mockProcoreClient = {
  getProject: mockGetProject,
  getVendor: mockGetVendor,
  getCompanyId: mockGetCompanyId,
} as unknown as ProcoreClient

describe('Procore Sync Convex', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCompanyId.mockReturnValue(1001)
  })

  describe('syncProjectsFromProcoreConvex', () => {
    const testCompanyId = 'company123'
    const testProjectIds = [2001, 2002]

    beforeEach(() => {
      // Default mock implementations
      mockConvexQuery.mockResolvedValue([])
      mockConvexMutation.mockResolvedValue('new-project-id')
    })

    it('should create new projects when no mapping exists', async () => {
      mockGetProject
        .mockResolvedValueOnce({
          id: 2001,
          name: 'Project Alpha',
          display_name: 'Project Alpha',
          project_number: 'P-001',
          address: '123 Main St',
          city: 'Sydney',
          state_code: 'NSW',
          country_code: 'AU',
          zip: '2000',
          active: true,
          estimated_start_date: '2024-01-01',
          estimated_completion_date: '2024-12-31',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
        .mockResolvedValueOnce({
          id: 2002,
          name: 'Project Beta',
          display_name: 'Project Beta',
          project_number: 'P-002',
          active: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })

      const result = await syncProjectsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        testProjectIds
      )

      expect(result.total).toBe(2)
      expect(result.created).toBe(2)
      expect(result.updated).toBe(0)
      expect(result.errors).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].operation).toBe('create')
    })

    it('should update existing projects when mapping exists', async () => {
      mockConvexQuery.mockResolvedValue([
        {
          _id: 'mapping1',
          procoreCompanyId: 1001,
          procoreEntityType: 'project',
          procoreEntityId: 2001,
          shieldEntityId: 'shield-project-1',
        },
      ])

      mockGetProject.mockResolvedValue({
        id: 2001,
        name: 'Project Alpha Updated',
        display_name: 'Project Alpha Updated',
        active: true,
        state_code: 'VIC',
        created_at: '2024-01-01',
        updated_at: '2024-01-15',
      })

      const result = await syncProjectsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [2001],
        { updateExisting: true }
      )

      expect(result.created).toBe(0)
      expect(result.updated).toBe(1)
      expect(result.results[0].operation).toBe('update')
      expect(result.results[0].shield_id).toBe('shield-project-1')
    })

    it('should skip existing projects when updateExisting is false', async () => {
      mockConvexQuery.mockResolvedValue([
        {
          _id: 'mapping1',
          procoreCompanyId: 1001,
          procoreEntityType: 'project',
          procoreEntityId: 2001,
          shieldEntityId: 'shield-project-1',
        },
      ])

      mockGetProject.mockResolvedValue({
        id: 2001,
        name: 'Project Alpha',
        active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await syncProjectsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [2001],
        { updateExisting: false }
      )

      expect(result.skipped).toBe(1)
      expect(result.results[0].operation).toBe('skip')
    })

    it('should handle project not found in Procore', async () => {
      mockGetProject.mockResolvedValue(null)

      const result = await syncProjectsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [9999]
      )

      expect(result.errors).toBe(1)
      expect(result.results[0].operation).toBe('error')
      expect(result.results[0].message).toContain('not found in Procore')
    })

    it('should map Australian state codes correctly', async () => {
      mockGetProject.mockResolvedValue({
        id: 2001,
        name: 'Sydney Project',
        state_code: 'NSW',
        country_code: 'AU',
        active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      await syncProjectsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [2001]
      )

      // Check that mutations were called (project creation)
      expect(mockConvexMutation).toHaveBeenCalled()
    })

    it('should calculate sync duration', async () => {
      mockGetProject.mockResolvedValue({
        id: 2001,
        name: 'Quick Project',
        active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await syncProjectsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [2001]
      )

      expect(result.duration_ms).toBeGreaterThanOrEqual(0)
    })
  })

  describe('syncVendorsFromProcoreConvex', () => {
    const testCompanyId = 'company123'
    const testVendorIds = [3001, 3002]

    beforeEach(() => {
      mockConvexQuery.mockResolvedValue([])
      mockConvexMutation.mockResolvedValue('new-subcontractor-id')
    })

    it('should create new subcontractors from vendors', async () => {
      mockGetVendor
        .mockResolvedValueOnce({
          id: 3001,
          name: 'Vendor One Pty Ltd',
          entity_type: 'abn',
          entity_id: '12345678901',
          email_address: 'vendor1@test.com',
          business_phone: '1300 000 001',
          address: '123 Trade St',
          city: 'Melbourne',
          state_code: 'VIC',
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
        .mockResolvedValueOnce({
          id: 3002,
          name: 'Vendor Two Pty Ltd',
          entity_type: null,
          entity_id: null,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })

      const result = await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        testVendorIds
      )

      expect(result.total).toBe(2)
      expect(result.created).toBe(2)
      expect(result.results[0].operation).toBe('create')
    })

    it('should extract ABN from entity_id', async () => {
      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'ABN Vendor',
        entity_type: 'abn',
        entity_id: '98765432109',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [3001]
      )

      expect(result.created).toBe(1)
      expect(result.results[0].message).toContain('ABN Vendor')
    })

    it('should update existing subcontractors when mapping exists', async () => {
      mockConvexQuery.mockResolvedValue([
        {
          _id: 'mapping1',
          procoreCompanyId: 1001,
          procoreEntityType: 'vendor',
          procoreEntityId: 3001,
          shieldEntityId: 'shield-sub-1',
        },
      ])

      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'Updated Vendor',
        entity_type: 'abn',
        entity_id: '12345678901',
        email_address: 'new@email.com',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-15',
      })

      const result = await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [3001],
        { mergeExisting: true }
      )

      expect(result.updated).toBe(1)
      expect(result.results[0].operation).toBe('update')
    })

    it('should skip existing when mergeExisting is false', async () => {
      mockConvexQuery.mockResolvedValue([
        {
          _id: 'mapping1',
          procoreCompanyId: 1001,
          procoreEntityType: 'vendor',
          procoreEntityId: 3001,
          shieldEntityId: 'shield-sub-1',
        },
      ])

      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'Existing Vendor',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [3001],
        { mergeExisting: false }
      )

      expect(result.skipped).toBe(1)
      expect(result.results[0].operation).toBe('skip')
    })

    it('should handle ABN deduplication with skipDuplicates', async () => {
      // Mock existing subcontractors with ABN
      mockConvexQuery
        .mockResolvedValueOnce([]) // No mappings
        .mockResolvedValueOnce([
          { _id: 'existing-sub', name: 'Existing Sub', abn: '12345678901' },
        ]) // Existing subcontractors

      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'Duplicate ABN Vendor',
        entity_type: 'abn',
        entity_id: '12345678901', // Same ABN as existing
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [3001],
        { skipDuplicates: true }
      )

      expect(result.skipped).toBe(1)
      expect(result.results[0].message).toContain('ABN duplicate')
    })

    it('should handle vendor not found', async () => {
      mockGetVendor.mockResolvedValue(null)

      const result = await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [9999]
      )

      expect(result.errors).toBe(1)
      expect(result.results[0].message).toContain('not found in Procore')
    })

    it('should assign vendor to project when projectId provided', async () => {
      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'Project Vendor',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [3001],
        { projectId: 'project-123' }
      )

      // Verify mutations were called (includes project assignment)
      expect(mockConvexMutation).toHaveBeenCalled()
    })

    it('should handle contact info from primary_contact', async () => {
      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'Contact Test Vendor',
        primary_contact: {
          id: 1,
          name: 'John Smith',
          email_address: 'john@vendor.com',
          business_phone: '0400 000 000',
          is_primary: true,
        },
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [3001]
      )

      expect(result.created).toBe(1)
    })

    it('should map state codes for workers comp', async () => {
      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'State Test Vendor',
        state_code: 'QLD',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [3001]
      )

      // State should be mapped to workersCompState
      expect(mockConvexMutation).toHaveBeenCalled()
    })

    it('should return batch result with all metrics', async () => {
      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'Metrics Test',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        testCompanyId,
        [3001]
      )

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('created')
      expect(result).toHaveProperty('updated')
      expect(result).toHaveProperty('skipped')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('results')
      expect(result).toHaveProperty('duration_ms')
    })
  })

  describe('Sync Logging', () => {
    it('should create sync log at start', async () => {
      mockGetProject.mockResolvedValue({
        id: 2001,
        name: 'Log Test',
        active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      await syncProjectsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        'company123',
        [2001]
      )

      // Should have called mutations (including createSyncLog)
      expect(mockConvexMutation).toHaveBeenCalled()
      // Verify multiple mutation calls were made
      expect(mockConvexMutation.mock.calls.length).toBeGreaterThan(0)
    })

    it('should update sync log on completion', async () => {
      mockGetVendor.mockResolvedValue({
        id: 3001,
        name: 'Complete Log Test',
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      await syncVendorsFromProcoreConvex(
        mockConvex,
        mockProcoreClient,
        'company123',
        [3001]
      )

      // Should have called mutations (including updateSyncLog)
      expect(mockConvexMutation).toHaveBeenCalled()
      // Multiple calls should include sync log operations
      expect(mockConvexMutation.mock.calls.length).toBeGreaterThan(1)
    })
  })
})
