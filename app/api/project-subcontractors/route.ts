import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'

// GET /api/project-subcontractors - List all project-subcontractor assignments
export async function GET(request: NextRequest) {
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

    // Get project subcontractors based on user role
    let projectSubcontractors
    if (['admin', 'risk_manager'].includes(user.role)) {
      // Admin and risk_manager see all company project-subcontractors
      projectSubcontractors = db.prepare(`
        SELECT
          ps.id,
          ps.project_id,
          ps.subcontractor_id,
          ps.status,
          ps.on_site_date,
          p.name as project_name,
          s.name as subcontractor_name,
          s.abn as subcontractor_abn
        FROM project_subcontractors ps
        JOIN projects p ON ps.project_id = p.id
        JOIN subcontractors s ON ps.subcontractor_id = s.id
        WHERE p.company_id = ?
        ORDER BY p.name, s.name
      `).all(user.company_id)
    } else if (['project_manager', 'project_administrator'].includes(user.role)) {
      // Project managers only see their assigned projects
      projectSubcontractors = db.prepare(`
        SELECT
          ps.id,
          ps.project_id,
          ps.subcontractor_id,
          ps.status,
          ps.on_site_date,
          p.name as project_name,
          s.name as subcontractor_name,
          s.abn as subcontractor_abn
        FROM project_subcontractors ps
        JOIN projects p ON ps.project_id = p.id
        JOIN subcontractors s ON ps.subcontractor_id = s.id
        WHERE p.company_id = ? AND p.project_manager_id = ?
        ORDER BY p.name, s.name
      `).all(user.company_id, user.id)
    } else {
      // Read-only users see all but cannot create exceptions anyway
      projectSubcontractors = db.prepare(`
        SELECT
          ps.id,
          ps.project_id,
          ps.subcontractor_id,
          ps.status,
          ps.on_site_date,
          p.name as project_name,
          s.name as subcontractor_name,
          s.abn as subcontractor_abn
        FROM project_subcontractors ps
        JOIN projects p ON ps.project_id = p.id
        JOIN subcontractors s ON ps.subcontractor_id = s.id
        WHERE p.company_id = ?
        ORDER BY p.name, s.name
      `).all(user.company_id)
    }

    return NextResponse.json({
      projectSubcontractors,
      total: projectSubcontractors.length
    })
  } catch (error) {
    console.error('Get project-subcontractors error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
