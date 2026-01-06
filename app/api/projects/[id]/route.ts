import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb, type Project } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'

// Helper function to check if user has access to project
function canAccessProject(user: { id: string; company_id: string | null; role: string }, project: Project): boolean {
  // Must be same company
  if (project.company_id !== user.company_id) {
    return false
  }

  // Admin, risk_manager, and read_only can access all company projects
  if (['admin', 'risk_manager', 'read_only'].includes(user.role)) {
    return true
  }

  // Project manager and project administrator can only access assigned projects
  if (['project_manager', 'project_administrator'].includes(user.role)) {
    return project.project_manager_id === user.id
  }

  return false
}

// GET /api/projects/[id] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const db = getDb()
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as Project | undefined

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check access
    if (!canAccessProject(user, project)) {
      return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
    }

    // Get project manager details
    let projectManager = null
    if (project.project_manager_id) {
      projectManager = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(project.project_manager_id)
    }

    // Get subcontractor counts
    const rawCounts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'compliant' THEN 1 ELSE 0 END) as compliant,
        SUM(CASE WHEN status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'exception' THEN 1 ELSE 0 END) as exception
      FROM project_subcontractors
      WHERE project_id = ?
    `).get(params.id) as {
      total: number | null
      compliant: number | null
      non_compliant: number | null
      pending: number | null
      exception: number | null
    }

    // Ensure counts have default values (SQLite SUM returns null when no rows)
    const counts = {
      total: rawCounts?.total ?? 0,
      compliant: rawCounts?.compliant ?? 0,
      non_compliant: rawCounts?.non_compliant ?? 0,
      pending: rawCounts?.pending ?? 0,
      exception: rawCounts?.exception ?? 0
    }

    // Get insurance requirements
    const requirements = db.prepare('SELECT * FROM insurance_requirements WHERE project_id = ?').all(params.id)

    return NextResponse.json({
      project: {
        ...project,
        project_manager: projectManager,
        counts,
        requirements
      }
    })
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Only admin and risk_manager can update projects
    if (!['admin', 'risk_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins and risk managers can update projects' }, { status: 403 })
    }

    const db = getDb()
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as Project | undefined

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check access
    if (!canAccessProject(user, project)) {
      return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
    }

    const body = await request.json()
    const { name, address, state, startDate, endDate, estimatedValue, projectManagerId, status } = body

    // Validate state if provided
    const validStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT']
    if (state && !validStates.includes(state)) {
      return NextResponse.json({ error: `Invalid state. Must be one of: ${validStates.join(', ')}` }, { status: 400 })
    }

    // Validate status if provided
    const validStatuses = ['active', 'completed', 'on_hold']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    // Validate project manager exists if provided
    if (projectManagerId) {
      const pm = db.prepare('SELECT id FROM users WHERE id = ? AND company_id = ?').get(projectManagerId, user.company_id)
      if (!pm) {
        return NextResponse.json({ error: 'Project manager not found' }, { status: 400 })
      }
    }

    // Update project
    db.prepare(`
      UPDATE projects SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        state = COALESCE(?, state),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        estimated_value = COALESCE(?, estimated_value),
        project_manager_id = COALESCE(?, project_manager_id),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name?.trim() || null,
      address?.trim() || null,
      state || null,
      startDate || null,
      endDate || null,
      estimatedValue || null,
      projectManagerId || null,
      status || null,
      params.id
    )

    // Log the action
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'project', ?, 'update', ?)
    `).run(uuidv4(), user.company_id, user.id, params.id, JSON.stringify({ name, state, status }))

    // Get updated project
    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id)

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    })

  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id] - Archive project (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Only admin can delete projects
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete projects' }, { status: 403 })
    }

    const db = getDb()
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as Project | undefined

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check access
    if (!canAccessProject(user, project)) {
      return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
    }

    // Archive the project (set status to completed)
    db.prepare(`UPDATE projects SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(params.id)

    // Log the action
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'project', ?, 'archive', ?)
    `).run(uuidv4(), user.company_id, user.id, params.id, JSON.stringify({ name: project.name }))

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully'
    })

  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
