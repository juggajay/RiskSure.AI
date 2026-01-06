import { NextRequest, NextResponse } from 'next/server'
import { getUserByToken } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = getUserByToken(token)

    if (!user) {
      const response = NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      )
      // Clear invalid cookie
      response.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      return response
    }

    // Get company info
    const db = getDb()
    let company = null
    if (user.company_id) {
      company = db.prepare(`
        SELECT id, name, abn, logo_url, subscription_tier, subscription_status
        FROM companies WHERE id = ?
      `).get(user.company_id)
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        company
      }
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
