/**
 * Procore Sync Module
 *
 * Handles synchronization of data between Procore and Shield-AI:
 * - Projects: Import from Procore to Shield-AI
 * - Vendors: Import from Procore to Shield-AI subcontractors
 * - Compliance: Push status from Shield-AI to Procore
 */

import { v4 as uuidv4 } from 'uuid'
import { getDb, type Project as ShieldProject } from '@/lib/db'
import { ProcoreClient } from './client'
import type {
  ProcoreProject,
  ProcoreVendor,
  ProcoreSyncResult,
  ProcoreSyncBatchResult,
  ProcoreMapping,
} from './types'
import { isAustralianStateCode, extractABNFromVendor } from './types'

// ============================================================================
// Types
// ============================================================================

export interface ProjectSyncOptions {
  updateExisting?: boolean // Update projects that already exist
}

export interface VendorSyncOptions {
  projectId?: string // Shield-AI project ID to assign vendors to
  skipDuplicates?: boolean // Skip vendors that already exist by ABN
  mergeExisting?: boolean // Merge with existing subcontractors by ABN
}

interface ExistingMapping {
  id: string
  shield_entity_id: string
  procore_entity_id: number
}

// ============================================================================
// Project Sync
// ============================================================================

/**
 * Map Procore project fields to Shield-AI project fields
 */
function mapProcoreProject(
  procoreProject: ProcoreProject,
  companyId: string
): {
  company_id: string
  name: string
  address: string | null
  state: ShieldProject['state']
  status: ShieldProject['status']
  start_date: string | null
  end_date: string | null
} {
  // Map Australian states, set null for US states
  const stateCode = procoreProject.state_code
  const mappedState = stateCode && isAustralianStateCode(stateCode)
    ? stateCode as ShieldProject['state']
    : null

  // Combine address fields into single address string
  const addressParts = [
    procoreProject.address,
    procoreProject.city,
    stateCode,
    procoreProject.zip,
  ].filter(Boolean)
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null

  return {
    company_id: companyId,
    name: procoreProject.name,
    address: fullAddress,
    state: mappedState,
    status: procoreProject.active ? 'active' : 'completed',
    start_date: procoreProject.estimated_start_date || procoreProject.actual_start_date || null,
    end_date: procoreProject.estimated_completion_date || procoreProject.projected_finish_date || null,
  }
}

/**
 * Sync selected projects from Procore to Shield-AI
 */
export async function syncProjectsFromProcore(
  client: ProcoreClient,
  companyId: string,
  projectIds: number[],
  options: ProjectSyncOptions = {}
): Promise<ProcoreSyncBatchResult> {
  const { updateExisting = true } = options
  const startTime = Date.now()
  const results: ProcoreSyncResult[] = []
  const db = getDb()
  const procoreCompanyId = client.getCompanyId()

  // Get existing mappings for these projects
  const existingMappings = db.prepare(`
    SELECT id, shield_entity_id, procore_entity_id
    FROM procore_mappings
    WHERE company_id = ? AND procore_company_id = ?
      AND procore_entity_type = 'project'
      AND procore_entity_id IN (${projectIds.map(() => '?').join(',')})
  `).all(companyId, procoreCompanyId, ...projectIds) as ExistingMapping[]

  const mappingsByProcoreId = new Map(
    existingMappings.map(m => [m.procore_entity_id, m])
  )

  // Log sync start
  const syncLogId = uuidv4()
  db.prepare(`
    INSERT INTO procore_sync_log (id, company_id, procore_company_id, sync_type, status, total_items, started_at)
    VALUES (?, ?, ?, 'projects', 'started', ?, datetime('now'))
  `).run(syncLogId, companyId, procoreCompanyId, projectIds.length)

  try {
    for (const projectId of projectIds) {
      try {
        // Fetch project from Procore
        const procoreProject = await client.getProject(projectId)

        if (!procoreProject) {
          results.push({
            success: false,
            operation: 'error',
            procore_id: projectId,
            shield_id: null,
            entity_type: 'project',
            message: 'Project not found in Procore',
          })
          continue
        }

        const existingMapping = mappingsByProcoreId.get(projectId)

        if (existingMapping) {
          // Project already synced
          if (updateExisting) {
            // Update existing project
            const projectData = mapProcoreProject(procoreProject, companyId)
            db.prepare(`
              UPDATE projects SET
                name = ?,
                address = ?,
                state = ?,
                status = ?,
                start_date = ?,
                end_date = ?,
                updated_at = datetime('now')
              WHERE id = ?
            `).run(
              projectData.name,
              projectData.address,
              projectData.state,
              projectData.status,
              projectData.start_date,
              projectData.end_date,
              existingMapping.shield_entity_id
            )

            // Update mapping timestamp
            db.prepare(`
              UPDATE procore_mappings SET last_synced_at = datetime('now'), updated_at = datetime('now')
              WHERE id = ?
            `).run(existingMapping.id)

            results.push({
              success: true,
              operation: 'update',
              procore_id: projectId,
              shield_id: existingMapping.shield_entity_id,
              entity_type: 'project',
              message: `Updated project: ${procoreProject.name}`,
            })
          } else {
            results.push({
              success: true,
              operation: 'skip',
              procore_id: projectId,
              shield_id: existingMapping.shield_entity_id,
              entity_type: 'project',
              message: `Skipped (already exists): ${procoreProject.name}`,
            })
          }
        } else {
          // Create new project
          const projectData = mapProcoreProject(procoreProject, companyId)
          const shieldProjectId = uuidv4()

          db.prepare(`
            INSERT INTO projects (id, company_id, name, address, state, status, start_date, end_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(
            shieldProjectId,
            companyId,
            projectData.name,
            projectData.address,
            projectData.state,
            projectData.status,
            projectData.start_date,
            projectData.end_date
          )

          // Create mapping
          db.prepare(`
            INSERT INTO procore_mappings (
              id, company_id, procore_company_id, procore_entity_type, procore_entity_id,
              shield_entity_type, shield_entity_id, sync_direction, sync_status, created_at, updated_at
            )
            VALUES (?, ?, ?, 'project', ?, 'project', ?, 'procore_to_shield', 'active', datetime('now'), datetime('now'))
          `).run(uuidv4(), companyId, procoreCompanyId, projectId, shieldProjectId)

          results.push({
            success: true,
            operation: 'create',
            procore_id: projectId,
            shield_id: shieldProjectId,
            entity_type: 'project',
            message: `Created project: ${procoreProject.name}`,
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          success: false,
          operation: 'error',
          procore_id: projectId,
          shield_id: null,
          entity_type: 'project',
          message: `Error syncing project ${projectId}: ${errorMessage}`,
        })
      }
    }

    const duration = Date.now() - startTime
    const created = results.filter(r => r.operation === 'create').length
    const updated = results.filter(r => r.operation === 'update').length
    const skipped = results.filter(r => r.operation === 'skip').length
    const errors = results.filter(r => r.operation === 'error').length

    // Update sync log
    db.prepare(`
      UPDATE procore_sync_log SET
        status = 'completed',
        created_count = ?,
        updated_count = ?,
        skipped_count = ?,
        error_count = ?,
        completed_at = datetime('now'),
        duration_ms = ?
      WHERE id = ?
    `).run(created, updated, skipped, errors, duration, syncLogId)

    return {
      total: projectIds.length,
      created,
      updated,
      skipped,
      errors,
      results,
      duration_ms: duration,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update sync log with failure
    db.prepare(`
      UPDATE procore_sync_log SET
        status = 'failed',
        error_message = ?,
        completed_at = datetime('now'),
        duration_ms = ?
      WHERE id = ?
    `).run(errorMessage, Date.now() - startTime, syncLogId)

    throw error
  }
}

// ============================================================================
// Vendor Sync
// ============================================================================

/**
 * Map Procore vendor fields to Shield-AI subcontractor fields
 */
function mapProcoreVendor(
  procoreVendor: ProcoreVendor,
  companyId: string
): {
  company_id: string
  name: string
  abn: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  status: string
} {
  const abn = extractABNFromVendor(procoreVendor)
  const state = procoreVendor.state_code
  const mappedState = state && isAustralianStateCode(state) ? state : null

  return {
    company_id: companyId,
    name: procoreVendor.name,
    abn,
    email: procoreVendor.email_address || procoreVendor.primary_contact?.email_address || null,
    phone: procoreVendor.business_phone || procoreVendor.primary_contact?.business_phone || null,
    address: procoreVendor.address || null,
    city: procoreVendor.city || null,
    state: mappedState,
    postcode: procoreVendor.zip || null,
    status: procoreVendor.is_active ? 'active' : 'inactive',
  }
}

/**
 * Find existing subcontractor by ABN
 */
function findSubcontractorByABN(companyId: string, abn: string): { id: string; name: string } | null {
  const db = getDb()
  const result = db.prepare(`
    SELECT id, name FROM subcontractors
    WHERE company_id = ? AND abn = ?
  `).get(companyId, abn) as { id: string; name: string } | undefined

  return result || null
}

/**
 * Sync selected vendors from Procore to Shield-AI subcontractors
 */
export async function syncVendorsFromProcore(
  client: ProcoreClient,
  companyId: string,
  vendorIds: number[],
  options: VendorSyncOptions = {}
): Promise<ProcoreSyncBatchResult> {
  const { projectId, skipDuplicates = false, mergeExisting = true } = options
  const startTime = Date.now()
  const results: ProcoreSyncResult[] = []
  const db = getDb()
  const procoreCompanyId = client.getCompanyId()

  // Get existing mappings for these vendors
  const existingMappings = db.prepare(`
    SELECT id, shield_entity_id, procore_entity_id
    FROM procore_mappings
    WHERE company_id = ? AND procore_company_id = ?
      AND procore_entity_type = 'vendor'
      AND procore_entity_id IN (${vendorIds.map(() => '?').join(',')})
  `).all(companyId, procoreCompanyId, ...vendorIds) as ExistingMapping[]

  const mappingsByProcoreId = new Map(
    existingMappings.map(m => [m.procore_entity_id, m])
  )

  // Log sync start
  const syncLogId = uuidv4()
  db.prepare(`
    INSERT INTO procore_sync_log (id, company_id, procore_company_id, sync_type, status, total_items, started_at)
    VALUES (?, ?, ?, 'vendors', 'started', ?, datetime('now'))
  `).run(syncLogId, companyId, procoreCompanyId, vendorIds.length)

  try {
    for (const vendorId of vendorIds) {
      try {
        // Fetch vendor from Procore
        const procoreVendor = await client.getVendor(vendorId)

        if (!procoreVendor) {
          results.push({
            success: false,
            operation: 'error',
            procore_id: vendorId,
            shield_id: null,
            entity_type: 'vendor',
            message: 'Vendor not found in Procore',
          })
          continue
        }

        const vendorData = mapProcoreVendor(procoreVendor, companyId)
        const existingMapping = mappingsByProcoreId.get(vendorId)

        if (existingMapping) {
          // Vendor already synced via mapping
          if (mergeExisting) {
            // Update existing subcontractor
            db.prepare(`
              UPDATE subcontractors SET
                name = ?,
                abn = COALESCE(?, abn),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                address = ?,
                city = ?,
                state = ?,
                postcode = ?,
                status = ?,
                updated_at = datetime('now')
              WHERE id = ?
            `).run(
              vendorData.name,
              vendorData.abn,
              vendorData.email,
              vendorData.phone,
              vendorData.address,
              vendorData.city,
              vendorData.state,
              vendorData.postcode,
              vendorData.status,
              existingMapping.shield_entity_id
            )

            // Update mapping timestamp
            db.prepare(`
              UPDATE procore_mappings SET last_synced_at = datetime('now'), updated_at = datetime('now')
              WHERE id = ?
            `).run(existingMapping.id)

            results.push({
              success: true,
              operation: 'update',
              procore_id: vendorId,
              shield_id: existingMapping.shield_entity_id,
              entity_type: 'vendor',
              message: `Updated subcontractor: ${procoreVendor.name}`,
            })
          } else {
            results.push({
              success: true,
              operation: 'skip',
              procore_id: vendorId,
              shield_id: existingMapping.shield_entity_id,
              entity_type: 'vendor',
              message: `Skipped (already synced): ${procoreVendor.name}`,
            })
          }
          continue
        }

        // Check for ABN duplicate
        if (vendorData.abn) {
          const existingByABN = findSubcontractorByABN(companyId, vendorData.abn)

          if (existingByABN) {
            if (skipDuplicates) {
              results.push({
                success: true,
                operation: 'skip',
                procore_id: vendorId,
                shield_id: existingByABN.id,
                entity_type: 'vendor',
                message: `Skipped (ABN duplicate): ${procoreVendor.name} - existing: ${existingByABN.name}`,
              })
              continue
            }

            if (mergeExisting) {
              // Merge with existing subcontractor
              db.prepare(`
                UPDATE subcontractors SET
                  name = CASE WHEN name = ? THEN name ELSE ? END,
                  email = COALESCE(?, email),
                  phone = COALESCE(?, phone),
                  address = COALESCE(?, address),
                  city = COALESCE(?, city),
                  state = COALESCE(?, state),
                  postcode = COALESCE(?, postcode),
                  updated_at = datetime('now')
                WHERE id = ?
              `).run(
                existingByABN.name,
                vendorData.name,
                vendorData.email,
                vendorData.phone,
                vendorData.address,
                vendorData.city,
                vendorData.state,
                vendorData.postcode,
                existingByABN.id
              )

              // Create mapping to existing subcontractor
              db.prepare(`
                INSERT INTO procore_mappings (
                  id, company_id, procore_company_id, procore_entity_type, procore_entity_id,
                  shield_entity_type, shield_entity_id, sync_direction, sync_status, created_at, updated_at
                )
                VALUES (?, ?, ?, 'vendor', ?, 'subcontractor', ?, 'procore_to_shield', 'active', datetime('now'), datetime('now'))
              `).run(uuidv4(), companyId, procoreCompanyId, vendorId, existingByABN.id)

              results.push({
                success: true,
                operation: 'update',
                procore_id: vendorId,
                shield_id: existingByABN.id,
                entity_type: 'vendor',
                message: `Merged with existing subcontractor: ${existingByABN.name}`,
                details: { mergedByABN: true },
              })
              continue
            }
          }
        }

        // Create new subcontractor
        const subcontractorId = uuidv4()

        db.prepare(`
          INSERT INTO subcontractors (id, company_id, name, abn, email, phone, address, city, state, postcode, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          subcontractorId,
          companyId,
          vendorData.name,
          vendorData.abn,
          vendorData.email,
          vendorData.phone,
          vendorData.address,
          vendorData.city,
          vendorData.state,
          vendorData.postcode,
          vendorData.status
        )

        // Create mapping
        db.prepare(`
          INSERT INTO procore_mappings (
            id, company_id, procore_company_id, procore_entity_type, procore_entity_id,
            shield_entity_type, shield_entity_id, sync_direction, sync_status, created_at, updated_at
          )
          VALUES (?, ?, ?, 'vendor', ?, 'subcontractor', ?, 'procore_to_shield', 'active', datetime('now'), datetime('now'))
        `).run(uuidv4(), companyId, procoreCompanyId, vendorId, subcontractorId)

        // Assign to project if specified
        if (projectId) {
          db.prepare(`
            INSERT OR IGNORE INTO project_subcontractors (id, project_id, subcontractor_id, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
          `).run(uuidv4(), projectId, subcontractorId)
        }

        results.push({
          success: true,
          operation: 'create',
          procore_id: vendorId,
          shield_id: subcontractorId,
          entity_type: 'vendor',
          message: `Created subcontractor: ${procoreVendor.name}`,
          details: vendorData.abn ? undefined : { warning: 'No ABN found - flagged for manual entry' },
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          success: false,
          operation: 'error',
          procore_id: vendorId,
          shield_id: null,
          entity_type: 'vendor',
          message: `Error syncing vendor ${vendorId}: ${errorMessage}`,
        })
      }
    }

    const duration = Date.now() - startTime
    const created = results.filter(r => r.operation === 'create').length
    const updated = results.filter(r => r.operation === 'update').length
    const skipped = results.filter(r => r.operation === 'skip').length
    const errors = results.filter(r => r.operation === 'error').length

    // Update sync log
    db.prepare(`
      UPDATE procore_sync_log SET
        status = 'completed',
        created_count = ?,
        updated_count = ?,
        skipped_count = ?,
        error_count = ?,
        completed_at = datetime('now'),
        duration_ms = ?
      WHERE id = ?
    `).run(created, updated, skipped, errors, duration, syncLogId)

    return {
      total: vendorIds.length,
      created,
      updated,
      skipped,
      errors,
      results,
      duration_ms: duration,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update sync log with failure
    db.prepare(`
      UPDATE procore_sync_log SET
        status = 'failed',
        error_message = ?,
        completed_at = datetime('now'),
        duration_ms = ?
      WHERE id = ?
    `).run(errorMessage, Date.now() - startTime, syncLogId)

    throw error
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Procore mapping for a Shield-AI entity
 */
export function getProcoreMapping(
  companyId: string,
  shieldEntityType: 'project' | 'subcontractor',
  shieldEntityId: string
): ProcoreMapping | null {
  const db = getDb()
  const result = db.prepare(`
    SELECT * FROM procore_mappings
    WHERE company_id = ? AND shield_entity_type = ? AND shield_entity_id = ?
  `).get(companyId, shieldEntityType, shieldEntityId) as ProcoreMapping | undefined

  return result || null
}

/**
 * Get all Procore mappings for a company
 */
export function getProcoreMappings(
  companyId: string,
  entityType?: 'project' | 'vendor'
): ProcoreMapping[] {
  const db = getDb()

  if (entityType) {
    return db.prepare(`
      SELECT * FROM procore_mappings
      WHERE company_id = ? AND procore_entity_type = ?
      ORDER BY created_at DESC
    `).all(companyId, entityType) as ProcoreMapping[]
  }

  return db.prepare(`
    SELECT * FROM procore_mappings
    WHERE company_id = ?
    ORDER BY created_at DESC
  `).all(companyId) as ProcoreMapping[]
}

/**
 * Get sync history for a company
 */
export function getSyncHistory(
  companyId: string,
  limit: number = 20
): Array<{
  id: string
  sync_type: string
  status: string
  total_items: number | null
  created_count: number | null
  updated_count: number | null
  error_count: number | null
  started_at: string
  duration_ms: number | null
}> {
  const db = getDb()
  return db.prepare(`
    SELECT id, sync_type, status, total_items, created_count, updated_count, error_count, started_at, duration_ms
    FROM procore_sync_log
    WHERE company_id = ?
    ORDER BY started_at DESC
    LIMIT ?
  `).all(companyId, limit) as Array<{
    id: string
    sync_type: string
    status: string
    total_items: number | null
    created_count: number | null
    updated_count: number | null
    error_count: number | null
    started_at: string
    duration_ms: number | null
  }>
}
