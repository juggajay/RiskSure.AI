import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'

// POST /api/test/update-project-subcontractor - Update project_subcontractor for testing
export async function POST(request: NextRequest) {
  // Security: Block test endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoints are disabled in production' }, { status: 403 })
  }

  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { projectSubcontractorId, status, onSiteDate } = body

    if (!projectSubcontractorId) {
      return NextResponse.json({ error: 'projectSubcontractorId is required' }, { status: 400 })
    }

    const db = getDb()

    // Verify project_subcontractor exists and belongs to user's company
    const ps = db.prepare(`
      SELECT ps.id, p.company_id
      FROM project_subcontractors ps
      JOIN projects p ON ps.project_id = p.id
      WHERE ps.id = ?
    `).get(projectSubcontractorId) as { id: string; company_id: string } | undefined

    if (!ps) {
      return NextResponse.json({ error: 'Project subcontractor not found' }, { status: 404 })
    }

    if (ps.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update query
    const updates: string[] = []
    const params: (string | null)[] = []

    if (status !== undefined) {
      updates.push('status = ?')
      params.push(status)
    }

    if (onSiteDate !== undefined) {
      updates.push('on_site_date = ?')
      params.push(onSiteDate)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    updates.push("updated_at = datetime('now')")
    params.push(projectSubcontractorId)

    db.prepare(`
      UPDATE project_subcontractors
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params)

    // Get updated record
    const updated = db.prepare(`
      SELECT ps.*, p.name as project_name, s.name as subcontractor_name
      FROM project_subcontractors ps
      JOIN projects p ON ps.project_id = p.id
      JOIN subcontractors s ON ps.subcontractor_id = s.id
      WHERE ps.id = ?
    `).get(projectSubcontractorId)

    return NextResponse.json({
      success: true,
      message: 'Project subcontractor updated',
      projectSubcontractor: updated
    })

  } catch (error) {
    console.error('Update project-subcontractor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
