import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByToken, hashPassword } from '@/lib/auth'

// POST /api/test/set-password - Set password for current user (for testing only)
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

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update the user's password
    const db = getDb()
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, user.id)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })

  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
