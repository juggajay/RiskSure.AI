import { NextRequest, NextResponse } from 'next/server'
import { getUserByToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { createProcoreClient } from '@/lib/procore'
import { syncProjectsFromProcore } from '@/lib/procore/sync'

interface OAuthConnection {
  id: string
  company_id: string
  access_token: string
  refresh_token: string | null
  procore_company_id: number | null
  procore_company_name: string | null
  pending_company_selection: number
}

interface SyncProjectsBody {
  projectIds: number[]
  updateExisting?: boolean
}

/**
 * POST /api/procore/projects/sync
 *
 * Syncs selected projects from Procore to Shield-AI.
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

    // Only admins can sync projects
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json() as SyncProjectsBody
    const { projectIds, updateExisting = true } = body

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({
        error: 'projectIds is required and must be a non-empty array of numbers',
      }, { status: 400 })
    }

    // Validate all IDs are numbers
    if (!projectIds.every(id => typeof id === 'number' && id > 0)) {
      return NextResponse.json({
        error: 'All projectIds must be positive numbers',
      }, { status: 400 })
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

    // Sync projects
    console.log(`[Procore Sync] Starting project sync for ${projectIds.length} projects`)
    const result = await syncProjectsFromProcore(
      client,
      user.company_id!,
      projectIds,
      { updateExisting }
    )

    // Create audit log entry
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'integration', 'procore', 'sync_projects', ?)
    `).run(
      uuidv4(),
      user.company_id,
      user.id,
      JSON.stringify({
        projectIds,
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        duration_ms: result.duration_ms,
      })
    )

    console.log(`[Procore Sync] Project sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`)

    return NextResponse.json({
      success: true,
      message: `Synced ${result.created + result.updated} project(s) from Procore`,
      result,
    })
  } catch (error) {
    console.error('Procore project sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync projects from Procore' },
      { status: 500 }
    )
  }
}
