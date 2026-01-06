import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'

// POST /api/test/expire-exception - Force expire an exception for testing
// This endpoint sets the expires_at to a past date to simulate time advancement
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { exceptionId } = body

    if (!exceptionId) {
      return NextResponse.json({ error: 'Exception ID is required' }, { status: 400 })
    }

    const db = getDb()

    // Verify exception exists and belongs to user's company
    const exception = db.prepare(`
      SELECT e.*, p.company_id
      FROM exceptions e
      JOIN project_subcontractors ps ON e.project_subcontractor_id = ps.id
      JOIN projects p ON ps.project_id = p.id
      WHERE e.id = ?
    `).get(exceptionId) as { id: string; company_id: string; status: string } | undefined

    if (!exception) {
      return NextResponse.json({ error: 'Exception not found' }, { status: 404 })
    }

    if (exception.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Set expires_at to yesterday to simulate expiration
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    db.prepare(`
      UPDATE exceptions
      SET expires_at = ?, expiration_type = 'specific_date', updated_at = datetime('now')
      WHERE id = ?
    `).run(yesterday.toISOString(), exceptionId)

    return NextResponse.json({
      success: true,
      message: 'Exception expiry date set to past. Fetch exceptions again to trigger expiration check.',
      exceptionId,
      newExpiresAt: yesterday.toISOString()
    })

  } catch (error) {
    console.error('Force expire exception error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
