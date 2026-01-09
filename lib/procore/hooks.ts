/**
 * Procore Integration Hooks
 *
 * Functions that integrate Procore sync with Shield-AI events.
 * Called automatically after verifications complete to push status to Procore.
 */

import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db'
import { createProcoreClient, isProcoreDevMode } from './index'
import type {
  ProcoreComplianceStatus,
  ProcoreMapping,
  ProcoreVendorInsuranceInput,
} from './types'
import { SHIELD_TO_PROCORE_INSURANCE_TYPE } from './types'

interface OAuthConnection {
  id: string
  company_id: string
  access_token: string
  refresh_token: string | null
  procore_company_id: number | null
  procore_company_name: string | null
  pending_company_selection: number
}

interface SubcontractorWithMapping {
  id: string
  name: string
  abn: string | null
  procore_mapping_id: string | null
  procore_vendor_id: number | null
}

interface CoverageItem {
  type: string
  status: 'valid' | 'expired' | 'missing' | 'insufficient'
  expiry_date?: string
  amount?: number
  policy_number?: string
  insurer_name?: string
}

/**
 * Map Shield-AI coverage type to Procore insurance type name
 */
function mapCoverageTypeToProcore(shieldType: string): string {
  const normalized = shieldType.toLowerCase().replace(/\s+/g, '_')

  const typeMap: Record<string, string> = {
    'public_liability': 'General Liability',
    'products_liability': 'General Liability',
    'workers_comp': 'Workers Compensation',
    'workers_compensation': 'Workers Compensation',
    'professional_indemnity': 'Professional Liability',
    'motor_vehicle': 'Auto Liability',
    'contract_works': 'Builders Risk',
    'umbrella': 'Umbrella',
  }

  return typeMap[normalized] || 'General Liability'
}

/**
 * Map Shield-AI coverage status to Procore insurance status
 */
function mapCoverageStatusToProcore(
  status: CoverageItem['status']
): 'compliant' | 'non_compliant' | 'expired' | 'pending_review' {
  switch (status) {
    case 'valid':
      return 'compliant'
    case 'expired':
      return 'expired'
    case 'missing':
    case 'insufficient':
      return 'non_compliant'
    default:
      return 'pending_review'
  }
}

/**
 * Convert Shield-AI coverage items to Procore insurance inputs
 */
function convertCoverageToInsurances(
  vendorId: number,
  coverageItems: CoverageItem[],
  verificationDate: string
): ProcoreVendorInsuranceInput[] {
  return coverageItems
    .filter(item => item.status !== 'missing') // Don't create records for missing coverage
    .map(item => {
      const input: ProcoreVendorInsuranceInput = {
        vendor_id: vendorId,
        insurance_type: mapCoverageTypeToProcore(item.type),
        status: mapCoverageStatusToProcore(item.status),
        additional_insured: true, // Common requirement
        waiver_of_subrogation: true, // Common requirement
      }

      if (item.policy_number) input.policy_number = item.policy_number
      if (item.insurer_name) input.insurance_company = item.insurer_name
      if (item.amount) input.limit = item.amount
      if (item.expiry_date) input.expiration_date = item.expiry_date

      return input
    })
}

/**
 * Determine compliance status from verification results
 */
function determineComplianceStatus(
  verificationStatus: string,
  results: Array<{ check_name: string; status: string; details?: string }>
): ProcoreComplianceStatus['compliance_status'] {
  if (verificationStatus === 'compliant') {
    return 'compliant'
  }
  if (verificationStatus === 'pending' || verificationStatus === 'in_progress') {
    return 'pending'
  }
  // Check if any results indicate expiration
  const hasExpired = results.some(r =>
    r.status === 'failed' &&
    (r.details?.toLowerCase().includes('expir') || r.check_name.toLowerCase().includes('expir'))
  )
  if (hasExpired) {
    return 'expired'
  }
  return 'non_compliant'
}

/**
 * Extract coverage summary from verification results
 */
function extractCoverageSummary(
  results: Array<{ check_name: string; status: string; details?: string }>
): CoverageItem[] {
  const coverage: CoverageItem[] = []

  // Map check names to coverage types
  const coverageTypes = [
    'public_liability',
    'products_liability',
    'workers_comp',
    'professional_indemnity',
    'motor_vehicle',
    'contract_works',
  ]

  for (const result of results) {
    const checkName = result.check_name.toLowerCase().replace(/\s+/g, '_')
    const matchedType = coverageTypes.find(type =>
      checkName.includes(type) || type.includes(checkName.split('_')[0])
    )

    if (matchedType || coverageTypes.some(t => checkName.includes(t.split('_')[0]))) {
      const type = matchedType || checkName
      let status: CoverageItem['status'] = 'valid'

      if (result.status === 'failed') {
        if (result.details?.toLowerCase().includes('expir')) {
          status = 'expired'
        } else if (result.details?.toLowerCase().includes('missing')) {
          status = 'missing'
        } else if (result.details?.toLowerCase().includes('insufficient') ||
                   result.details?.toLowerCase().includes('below')) {
          status = 'insufficient'
        } else {
          status = 'missing'
        }
      }

      coverage.push({ type, status })
    }
  }

  return coverage
}

/**
 * Push compliance status to Procore for a subcontractor
 * This is called after a verification completes.
 *
 * Note: This is non-blocking and logs failures rather than throwing.
 */
export async function pushComplianceToProcore(
  companyId: string,
  subcontractorId: string,
  verificationId: string
): Promise<{
  pushed: boolean
  message: string
  procoreVendorId?: number
}> {
  const db = getDb()

  try {
    // Check if Procore is connected for this company
    const connection = db.prepare(`
      SELECT * FROM oauth_connections
      WHERE company_id = ? AND provider = 'procore' AND pending_company_selection = 0
    `).get(companyId) as OAuthConnection | undefined

    if (!connection || !connection.procore_company_id) {
      return {
        pushed: false,
        message: 'Procore not connected or company not selected',
      }
    }

    // Check if subcontractor has a Procore mapping
    const mapping = db.prepare(`
      SELECT * FROM procore_mappings
      WHERE company_id = ? AND shield_entity_type = 'subcontractor' AND shield_entity_id = ?
    `).get(companyId, subcontractorId) as ProcoreMapping | undefined

    if (!mapping) {
      return {
        pushed: false,
        message: 'Subcontractor not synced from Procore - no mapping exists',
      }
    }

    // Get verification details
    const verification = db.prepare(`
      SELECT v.*, s.name as subcontractor_name, s.abn
      FROM verifications v
      JOIN subcontractors s ON v.subcontractor_id = s.id
      WHERE v.id = ?
    `).get(verificationId) as {
      id: string
      status: string
      results: string
      verified_at: string | null
      subcontractor_name: string
      abn: string | null
    } | undefined

    if (!verification) {
      return {
        pushed: false,
        message: 'Verification not found',
      }
    }

    // Parse verification results
    let results: Array<{ check_name: string; status: string; details?: string }> = []
    try {
      results = JSON.parse(verification.results || '[]')
    } catch {
      // Empty results
    }

    // Build compliance status
    const complianceStatus: ProcoreComplianceStatus = {
      vendor_id: mapping.procore_entity_id,
      shield_subcontractor_id: subcontractorId,
      compliance_status: determineComplianceStatus(verification.status, results),
      coverage_summary: extractCoverageSummary(results),
      last_verified_at: verification.verified_at || new Date().toISOString(),
      verification_id: verificationId,
    }

    // In dev mode, just log the push
    if (isProcoreDevMode()) {
      console.log('[Procore DEV] Would push compliance status:', {
        vendorId: mapping.procore_entity_id,
        status: complianceStatus.compliance_status,
        coverageCount: complianceStatus.coverage_summary.length,
      })

      // Log to audit
      db.prepare(`
        INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
        VALUES (?, ?, 'system', 'subcontractor', ?, 'procore_compliance_push', ?)
      `).run(
        uuidv4(),
        companyId,
        subcontractorId,
        JSON.stringify({
          procore_vendor_id: mapping.procore_entity_id,
          compliance_status: complianceStatus.compliance_status,
          verification_id: verificationId,
          dev_mode: true,
        })
      )

      return {
        pushed: true,
        message: '[DEV MODE] Compliance status logged (would push to Procore)',
        procoreVendorId: mapping.procore_entity_id,
      }
    }

    // Production: Push to Procore via Insurance API
    const client = createProcoreClient({
      companyId: connection.procore_company_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token || '',
      onTokenRefresh: async (tokens) => {
        db.prepare(`
          UPDATE oauth_connections
          SET access_token = ?, refresh_token = ?, token_expires_at = datetime('now', '+' || ? || ' seconds'), updated_at = datetime('now')
          WHERE id = ?
        `).run(tokens.access_token, tokens.refresh_token, tokens.expires_in, connection.id)
      },
    })

    // Convert coverage summary to Procore insurance records
    const insuranceInputs = convertCoverageToInsurances(
      mapping.procore_entity_id,
      complianceStatus.coverage_summary,
      complianceStatus.last_verified_at
    )

    // Sync insurance records to Procore
    let syncResult = { created: 0, updated: 0, errors: [] as string[] }
    if (insuranceInputs.length > 0) {
      syncResult = await client.syncVendorInsurances(
        mapping.procore_entity_id,
        insuranceInputs
      )
    }

    // Also update custom fields with overall status summary (for quick reference)
    try {
      await client.updateVendorCustomFields(mapping.procore_entity_id, {
        shield_compliance_status: complianceStatus.compliance_status,
        shield_last_verified: complianceStatus.last_verified_at,
        shield_verification_id: verificationId,
      })
    } catch (customFieldError) {
      // Custom fields might not be configured - log but don't fail
      console.warn('[Procore] Could not update custom fields (may not be configured):', customFieldError)
    }

    // Log successful push
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'system', 'subcontractor', ?, 'procore_compliance_push', ?)
    `).run(
      uuidv4(),
      companyId,
      subcontractorId,
      JSON.stringify({
        procore_vendor_id: mapping.procore_entity_id,
        compliance_status: complianceStatus.compliance_status,
        verification_id: verificationId,
        insurance_sync: {
          created: syncResult.created,
          updated: syncResult.updated,
          errors: syncResult.errors,
        },
        success: true,
      })
    )

    const syncSummary = `${syncResult.created} created, ${syncResult.updated} updated`
    console.log(`[Procore] Pushed compliance status "${complianceStatus.compliance_status}" for vendor ${mapping.procore_entity_id} (${syncSummary})`)

    return {
      pushed: true,
      message: `Compliance status "${complianceStatus.compliance_status}" pushed to Procore (${syncSummary} insurance records)`,
      procoreVendorId: mapping.procore_entity_id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed push (don't throw - this is non-blocking)
    console.error(`[Procore] Failed to push compliance status for subcontractor ${subcontractorId}:`, errorMessage)

    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'system', 'subcontractor', ?, 'procore_compliance_push_failed', ?)
    `).run(
      uuidv4(),
      companyId,
      subcontractorId,
      JSON.stringify({
        error: errorMessage,
      })
    )

    return {
      pushed: false,
      message: `Failed to push to Procore: ${errorMessage}`,
    }
  }
}

/**
 * Queue compliance push for async processing
 * Use this in verification completion handlers to avoid blocking
 */
export function queueCompliancePush(
  companyId: string,
  subcontractorId: string,
  verificationId: string
): void {
  // In a production environment, this would use a proper queue (Redis, SQS, etc.)
  // For now, we'll use a simple setTimeout to make it non-blocking
  setImmediate(async () => {
    try {
      await pushComplianceToProcore(companyId, subcontractorId, verificationId)
    } catch (error) {
      console.error('[Procore] Queued compliance push failed:', error)
    }
  })
}

/**
 * Get compliance push history for a subcontractor
 */
export function getCompliancePushHistory(
  companyId: string,
  subcontractorId: string,
  limit: number = 10
): Array<{
  id: string
  action: string
  details: string
  created_at: string
}> {
  const db = getDb()
  return db.prepare(`
    SELECT id, action, details, created_at
    FROM audit_logs
    WHERE company_id = ? AND entity_type = 'subcontractor' AND entity_id = ?
      AND action IN ('procore_compliance_push', 'procore_compliance_push_failed')
    ORDER BY created_at DESC
    LIMIT ?
  `).all(companyId, subcontractorId, limit) as Array<{
    id: string
    action: string
    details: string
    created_at: string
  }>
}
