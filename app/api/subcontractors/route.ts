import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'

// GET /api/subcontractors - List all subcontractors for the company
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

    // Get all subcontractors for the company
    const subcontractors = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM project_subcontractors ps WHERE ps.subcontractor_id = s.id) as project_count
      FROM subcontractors s
      WHERE s.company_id = ?
      ORDER BY s.name ASC
    `).all(user.company_id)

    return NextResponse.json({
      subcontractors,
      total: subcontractors.length
    })
  } catch (error) {
    console.error('Get subcontractors error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/subcontractors - Create a new subcontractor
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Only admin, risk_manager, project_manager can create subcontractors
    if (!['admin', 'risk_manager', 'project_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins, risk managers, and project managers can create subcontractors' }, { status: 403 })
    }

    const body = await request.json()
    const { name, abn, contactName, contactEmail, contactPhone, trade } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Subcontractor name is required' }, { status: 400 })
    }

    const db = getDb()

    // Check if ABN already exists for this company
    if (abn) {
      const cleanedABN = abn.replace(/\s/g, '')
      const existingSub = db.prepare('SELECT id FROM subcontractors WHERE company_id = ? AND abn = ?').get(user.company_id, cleanedABN)
      if (existingSub) {
        return NextResponse.json({ error: 'A subcontractor with this ABN already exists' }, { status: 409 })
      }
    }

    // Create subcontractor
    const subcontractorId = uuidv4()
    const cleanedABN = abn ? abn.replace(/\s/g, '') : null

    db.prepare(`
      INSERT INTO subcontractors (id, company_id, name, abn, contact_name, contact_email, contact_phone, trade)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subcontractorId,
      user.company_id,
      name.trim(),
      cleanedABN,
      contactName?.trim() || null,
      contactEmail?.toLowerCase().trim() || null,
      contactPhone?.trim() || null,
      trade?.trim() || null
    )

    // Log the action
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'subcontractor', ?, 'create', ?)
    `).run(uuidv4(), user.company_id, user.id, subcontractorId, JSON.stringify({ name: name.trim(), abn: cleanedABN }))

    // Get the created subcontractor
    const subcontractor = db.prepare('SELECT * FROM subcontractors WHERE id = ?').get(subcontractorId)

    return NextResponse.json({
      success: true,
      message: 'Subcontractor created successfully',
      subcontractor
    }, { status: 201 })

  } catch (error) {
    console.error('Create subcontractor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
