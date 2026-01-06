import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// This endpoint is for debugging only - remove in production
export async function GET() {
  try {
    const db = getDb()

    const users = db.prepare('SELECT id, email, name, role, company_id, created_at FROM users').all()
    const companies = db.prepare('SELECT id, name, abn, created_at FROM companies').all()
    const sessions = db.prepare('SELECT id, user_id, expires_at FROM sessions').all()
    const projects = db.prepare('SELECT id, name, company_id, project_manager_id FROM projects').all()
    const subcontractors = db.prepare('SELECT id, name, abn, company_id FROM subcontractors').all()
    const projectSubcontractors = db.prepare(`
      SELECT ps.id, ps.project_id, ps.subcontractor_id, ps.status,
             p.name as project_name, s.name as subcontractor_name
      FROM project_subcontractors ps
      JOIN projects p ON ps.project_id = p.id
      JOIN subcontractors s ON ps.subcontractor_id = s.id
    `).all()
    const exceptions = db.prepare('SELECT * FROM exceptions').all()

    return NextResponse.json({
      users,
      companies,
      sessions,
      projects,
      subcontractors,
      projectSubcontractors,
      exceptions,
      counts: {
        users: users.length,
        companies: companies.length,
        sessions: sessions.length,
        projects: projects.length,
        subcontractors: subcontractors.length,
        projectSubcontractors: projectSubcontractors.length,
        exceptions: exceptions.length
      }
    })
  } catch (error) {
    console.error('Debug DB error:', error)
    return NextResponse.json({ error: 'Failed to query database' }, { status: 500 })
  }
}
