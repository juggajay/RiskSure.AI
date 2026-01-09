import { NextRequest, NextResponse } from 'next/server'
import { getUserByToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { createProcoreClient } from '@/lib/procore'
import { syncVendorsFromProcore } from '@/lib/procore/sync'

interface OAuthConnection {
  id: string
  company_id: string
  access_token: string
  refresh_token: string | null
  procore_company_id: number | null
  procore_company_name: string | null
  pending_company_selection: number
}

interface SyncVendorsBody {
  vendorIds: number[]
  projectId?: string // Shield-AI project ID to assign vendors to
  skipDuplicates?: boolean // Skip vendors with ABN conflicts
  mergeExisting?: boolean // Merge with existing subcontractors by ABN
}

/**
 * POST /api/procore/vendors/sync
 *
 * Syncs selected vendors from Procore to Shield-AI subcontractors.
 * Handles ABN conflict resolution and project assignment.
 */
export async function POST(request: NextRequest) {
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

    // Only admins can sync vendors
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json() as SyncVendorsBody
    const {
      vendorIds,
      projectId,
      skipDuplicates = false,
      mergeExisting = true,
    } = body

    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      return NextResponse.json({
        error: 'vendorIds is required and must be a non-empty array of numbers',
      }, { status: 400 })
    }

    // Validate all IDs are numbers
    if (!vendorIds.every(id => typeof id === 'number' && id > 0)) {
      return NextResponse.json({
        error: 'All vendorIds must be positive numbers',
      }, { status: 400 })
    }

    const db = getDb()

    // Validate project if specified
    if (projectId) {
      const project = db.prepare(`
        SELECT id FROM projects WHERE id = ? AND company_id = ?
      `).get(projectId, user.company_id)

      if (!project) {
        return NextResponse.json({
          error: 'Project not found or you do not have access',
        }, { status: 404 })
      }
    }

    // Get Procore connection
    const connection = db.prepare(`
      SELECT * FROM oauth_connections
      WHERE company_id = ? AND provider = 'procore'
    `).get(user.company_id) as OAuthConnection | undefined

    if (!connection) {
      return NextResponse.json({
        error: 'Procore not connected. Please connect first.',
      }, { status: 404 })
    }

    if (connection.pending_company_selection || !connection.procore_company_id) {
      return NextResponse.json({
        error: 'Please select a Procore company first.',
      }, { status: 400 })
    }

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

    // Sync vendors
    console.log(`[Procore Sync] Starting vendor sync for ${vendorIds.length} vendors`)
    const result = await syncVendorsFromProcore(
      client,
      user.company_id!,
      vendorIds,
      { projectId, skipDuplicates, mergeExisting }
    )

    // Create audit log entry
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'integration', 'procore', 'sync_vendors', ?)
    `).run(
      uuidv4(),
      user.company_id,
      user.id,
      JSON.stringify({
        vendorIds,
        projectId,
        options: { skipDuplicates, mergeExisting },
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        duration_ms: result.duration_ms,
      })
    )

    // Collect warnings for vendors without ABN
    const warnings: string[] = []
    for (const r of result.results) {
      if (r.details?.warning) {
        warnings.push(`${r.message}: ${r.details.warning}`)
      }
    }

    console.log(`[Procore Sync] Vendor sync completed: ${result.created} created, ${result.updated} updated/merged, ${result.skipped} skipped, ${result.errors} errors`)

    return NextResponse.json({
      success: true,
      message: `Synced ${result.created + result.updated} subcontractor(s) from Procore`,
      result,
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  } catch (error) {
    console.error('Procore vendor sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync vendors from Procore' },
      { status: 500 }
    )
  }
}
