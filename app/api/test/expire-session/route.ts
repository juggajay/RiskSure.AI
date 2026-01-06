import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// This endpoint is for TESTING ONLY - it expires a user's session immediately
// DO NOT use in production
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No session found' }, { status: 400 })
    }

    const db = getDb()

    // Find session by token and set expires_at to past time
    const result = db.prepare(`
      UPDATE sessions
      SET expires_at = datetime('now', '-1 hour')
      WHERE token = ?
    `).run(token)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Session expired for testing purposes'
    })
  } catch (error) {
    console.error('Test expire session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
