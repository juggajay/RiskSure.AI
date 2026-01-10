import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'
import { verifyPassword } from '@/lib/auth'

// POST /api/auth/verify-password - Verify current user's password
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const convex = getConvex()

    // Get user from session
    const sessionData = await convex.query(api.auth.getUserWithSession, { token })
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // Get user with password hash (internal query)
    const userWithPassword = await convex.query(api.users.getByEmailInternal, {
      email: sessionData.user.email,
    })

    if (!userWithPassword) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordValid = await verifyPassword(password, userWithPassword.passwordHash)

    if (!passwordValid) {
      return NextResponse.json({ error: 'Incorrect password', valid: false }, { status: 401 })
    }

    return NextResponse.json({ valid: true, message: 'Password verified' })

  } catch (error) {
    console.error('Verify password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
