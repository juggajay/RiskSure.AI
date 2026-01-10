import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const convex = getConvex()

    // Get user with session
    const sessionData = await convex.query(api.auth.getUserWithSession, { token })

    if (!sessionData) {
      const response = NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      )
      response.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      return response
    }

    const { user, company } = sessionData

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatarUrl,
        company: company ? {
          id: company._id,
          name: company.name,
          abn: company.abn,
          logo_url: company.logoUrl,
          subscription_tier: company.subscriptionTier,
          subscription_status: company.subscriptionStatus,
        } : null
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
