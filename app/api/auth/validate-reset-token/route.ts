import { NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const convex = getConvex()

    // Validate the reset token
    const tokenDoc = await convex.query(api.auth.getPasswordResetToken, { token })

    if (!tokenDoc) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Validate reset token error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
