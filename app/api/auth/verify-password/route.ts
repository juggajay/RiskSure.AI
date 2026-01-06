import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByToken, verifyPassword } from '@/lib/auth'

// POST /api/auth/verify-password - Verify current user's password
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

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const db = getDb()
    const userWithPassword = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as { password_hash: string } | undefined

    if (!userWithPassword) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordValid = await verifyPassword(password, userWithPassword.password_hash)

    if (!passwordValid) {
      return NextResponse.json({ error: 'Incorrect password', valid: false }, { status: 401 })
    }

    return NextResponse.json({ valid: true, message: 'Password verified' })

  } catch (error) {
    console.error('Verify password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
