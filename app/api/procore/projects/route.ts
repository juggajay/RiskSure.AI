import { NextRequest, NextResponse } from 'next/server'
import { getUserByToken, getUserByTokenAsync } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getDb, isProduction, getSupabase } from '@/lib/db'
import { createProcoreClient, type ProcoreProject } from '@/lib/procore'

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

interface ProjectWithSyncStatus extends ProcoreProject {
  syncStatus: 'synced' | 'not_synced' | 'updated'
  shieldProjectId?: string
}

/**
 * GET /api/procore/projects
 *
 * Lists projects from Procore with their sync status.
 * Shows which projects are already synced to Shield-AI.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = (await cookieStore).get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user - use async version for production (Supabase), sync for dev (SQLite)
    const user = isProduction
      ? await getUserByTokenAsync(token)
      : getUserByToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admins and risk managers can view projects
    if (!['admin', 'risk_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin or risk manager access required' }, { status: 403 })
    }

    let connection: OAuthConnection | undefined

    if (isProduction) {
      const supabase = getSupabase()
      const { data, error: queryError } = await supabase
        .from('oauth_connections')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('provider', 'procore')
        .single()

      if (queryError) {
        console.error('[Procore] Connection lookup error:', queryError)
      }
      if (data) {
        connection = data as OAuthConnection
      }
    } else {
      const db = getDb()
      connection = db.prepare(`
        SELECT * FROM oauth_connections
        WHERE company_id = ? AND provider = 'procore'
      `).get(user.company_id) as OAuthConnection | undefined
    }

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

    // Get pagination params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('per_page') || '100', 10)

    // Create Procore client with token refresh handler
    const client = createProcoreClient({
      companyId: connection.procore_company_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token || '',
      onTokenRefresh: async (tokens) => {
        // Update stored tokens
        if (isProduction) {
          const supabase = getSupabase()
          const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 7200) * 1000).toISOString()
          await supabase.from('oauth_connections').update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: tokenExpiresAt,
            updated_at: new Date().toISOString()
          }).eq('id', connection!.id)
        } else {
          const db = getDb()
          db.prepare(`
            UPDATE oauth_connections
            SET access_token = ?, refresh_token = ?, token_expires_at = datetime('now', '+' || ? || ' seconds'), updated_at = datetime('now')
            WHERE id = ?
          `).run(tokens.access_token, tokens.refresh_token, tokens.expires_in, connection!.id)
        }
      },
    })

    // Fetch projects from Procore
    const projectsResponse = await client.getProjects({ page, per_page: perPage })

    // Get existing mappings
    const projectIds = projectsResponse.data.map(p => p.id)
    let existingMappings: ProcoreMapping[] = []

    if (projectIds.length > 0) {
      if (isProduction) {
        const supabase = getSupabase()
        const { data } = await supabase
          .from('procore_mappings')
          .select('procore_entity_id, shield_entity_id')
          .eq('company_id', user.company_id)
          .eq('procore_company_id', connection.procore_company_id)
          .eq('procore_entity_type', 'project')
          .in('procore_entity_id', projectIds)
        existingMappings = (data || []) as ProcoreMapping[]
      } else {
        const db = getDb()
        existingMappings = db.prepare(`
          SELECT procore_entity_id, shield_entity_id
          FROM procore_mappings
          WHERE company_id = ? AND procore_company_id = ?
            AND procore_entity_type = 'project'
            AND procore_entity_id IN (${projectIds.map(() => '?').join(',')})
        `).all(user.company_id, connection.procore_company_id, ...projectIds) as ProcoreMapping[]
      }
    }

    const mappingsByProcoreId = new Map(
      existingMappings.map(m => [m.procore_entity_id, m.shield_entity_id])
    )

    // Add sync status to projects
    const projectsWithStatus: ProjectWithSyncStatus[] = projectsResponse.data.map(project => ({
      ...project,
      syncStatus: mappingsByProcoreId.has(project.id) ? 'synced' : 'not_synced',
      shieldProjectId: mappingsByProcoreId.get(project.id),
    }))

    return NextResponse.json({
      projects: projectsWithStatus,
      pagination: {
        page,
        perPage,
        hasMore: projectsResponse.hasMore,
        total: projectsResponse.total,
      },
      procoreCompany: {
        id: connection.procore_company_id,
        name: connection.procore_company_name,
      },
    })
  } catch (error) {
    console.error('Procore projects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Procore projects' },
      { status: 500 }
    )
  }
}
