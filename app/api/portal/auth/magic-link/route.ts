import { NextRequest, NextResponse } from 'next/server'
import { createMagicLinkToken } from '@/lib/auth'
import { authLimiter, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Security: Rate limiting to prevent email flooding and enumeration
  const rateLimitResult = authLimiter.check(request, 'portal-magic-link')
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Create magic link token
    const { token, expiresAt } = createMagicLinkToken(normalizedEmail)

    // In development, log the magic link to the console
    const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/verify?token=${token}`

    // Security: Only log sensitive info in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================')
      console.log('MAGIC LINK (Development Mode)')
      console.log('========================================')
      console.log(`Email: ${normalizedEmail}`)
      console.log(`Magic Link URL: ${magicLinkUrl}`)
      console.log(`Expires: ${expiresAt}`)
      console.log('========================================\n')
    }

    // In production, this would send an email via SendGrid
    // await sendMagicLinkEmail(normalizedEmail, magicLinkUrl)

    return NextResponse.json({
      success: true,
      message: 'Magic link sent! Check your email to sign in.'
    })
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
