import { NextRequest, NextResponse } from 'next/server'
import { getUserByToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { createProcoreClient, extractABNFromVendor, type ProcoreVendor } from '@/lib/procore'

interface OAuthConnection {
  id: string
  company_id: string
  access_token: string
  refresh_token: string | null
  procore_company_id: number | null
  procore_company_name: string | null
  pending_company_selection: number
}

interface ProcoreMapping {
  procore_entity_id: number
  shield_entity_id: string
}

interface ExistingSubcontractor {
  id: string
  name: string
  abn: string | null
}

interface VendorWithSyncStatus extends ProcoreVendor {
  syncStatus: 'synced' | 'not_synced' | 'abn_conflict'
  shieldSubcontractorId?: string
  extractedABN: string | null
  conflictDetails?: {
    existingId: string
    existingName: string
  }
}

/**
 * GET /api/procore/vendors
 *
 * Lists vendors from Procore company directory with sync status.
 * Includes ABN extraction and conflict detection.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = (await cookieStore).get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admins and risk managers can view vendors
    if (!['admin', 'risk_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin or risk manager access required' }, { status: 403 })
    }

    const db = getDb()

    // Get Procore connection
    const connection = db.prepare(`
      SELECT * FROM oauth_connections
      WHERE company_id = ? AND provider = 'procore'
    `).get(user.company_id) as OAuthConnection | undefined

    if (!connection) {
      return NextResponse.json({
        error: 'Procore not connected. Please connect first.',
        needsConnection: true,
      }, { status: 404 })
    }

    if (connection.pending_company_selection || !connection.procore_company_id) {
      return NextResponse.json({
        error: 'Please select a Procore company first.',
        needsCompanySelection: true,
      }, { status: 400 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('per_page') || '100', 10)
    const projectId = searchParams.get('project_id')
    const activeOnly = searchParams.get('active') !== 'false'

    // Create Procore client
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

    // Fetch vendors from Procore
    let vendorsResponse
    if (projectId) {
      // Get project-specific vendors
      vendorsResponse = await client.getProjectVendors(parseInt(projectId, 10), { page, per_page: perPage })
    } else {
      // Get company directory vendors
      vendorsResponse = await client.getVendors({ page, per_page: perPage, isActive: activeOnly })
    }

    // Get existing mappings
    const vendorIds = vendorsResponse.data.map(v => v.id)
    const existingMappings = vendorIds.length > 0
      ? db.prepare(`
          SELECT procore_entity_id, shield_entity_id
          FROM procore_mappings
          WHERE company_id = ? AND procore_company_id = ?
            AND procore_entity_type = 'vendor'
            AND procore_entity_id IN (${vendorIds.map(() => '?').join(',')})
        `).all(user.company_id, connection.procore_company_id, ...vendorIds) as ProcoreMapping[]
      : []

    const mappingsByProcoreId = new Map(
      existingMappings.map(m => [m.procore_entity_id, m.shield_entity_id])
    )

    // Extract ABNs and check for conflicts
    const abnsToCheck: string[] = []
    const vendorABNs = new Map<number, string>()

    for (const vendor of vendorsResponse.data) {
      const abn = extractABNFromVendor(vendor)
      if (abn) {
        vendorABNs.set(vendor.id, abn)
        if (!mappingsByProcoreId.has(vendor.id)) {
          abnsToCheck.push(abn)
        }
      }
    }

    // Check for ABN conflicts
    const abnConflicts = new Map<string, ExistingSubcontractor>()
    if (abnsToCheck.length > 0) {
      const existingSubcontractors = db.prepare(`
        SELECT id, name, abn FROM subcontractors
        WHERE company_id = ? AND abn IN (${abnsToCheck.map(() => '?').join(',')})
      `).all(user.company_id, ...abnsToCheck) as ExistingSubcontractor[]

      for (const sub of existingSubcontractors) {
        if (sub.abn) {
          abnConflicts.set(sub.abn, sub)
        }
      }
    }

    // Build response with sync status
    const vendorsWithStatus: VendorWithSyncStatus[] = vendorsResponse.data.map(vendor => {
      const extractedABN = vendorABNs.get(vendor.id) || null
      const shieldSubcontractorId = mappingsByProcoreId.get(vendor.id)

      let syncStatus: 'synced' | 'not_synced' | 'abn_conflict' = 'not_synced'
      let conflictDetails: VendorWithSyncStatus['conflictDetails']

      if (shieldSubcontractorId) {
        syncStatus = 'synced'
      } else if (extractedABN && abnConflicts.has(extractedABN)) {
        syncStatus = 'abn_conflict'
        const conflict = abnConflicts.get(extractedABN)!
        conflictDetails = {
          existingId: conflict.id,
          existingName: conflict.name,
        }
      }

      return {
        ...vendor,
        syncStatus,
        shieldSubcontractorId,
        extractedABN,
        conflictDetails,
      }
    })

    // Summary stats
    const stats = {
      total: vendorsWithStatus.length,
      synced: vendorsWithStatus.filter(v => v.syncStatus === 'synced').length,
      notSynced: vendorsWithStatus.filter(v => v.syncStatus === 'not_synced').length,
      abnConflicts: vendorsWithStatus.filter(v => v.syncStatus === 'abn_conflict').length,
      withABN: vendorsWithStatus.filter(v => v.extractedABN).length,
      withoutABN: vendorsWithStatus.filter(v => !v.extractedABN).length,
    }

    return NextResponse.json({
      vendors: vendorsWithStatus,
      stats,
      pagination: {
        page,
        perPage,
        hasMore: vendorsResponse.hasMore,
        total: vendorsResponse.total,
      },
      procoreCompany: {
        id: connection.procore_company_id,
        name: connection.procore_company_name,
      },
    })
  } catch (error) {
    console.error('Procore vendors error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Procore vendors' },
      { status: 500 }
    )
  }
}
