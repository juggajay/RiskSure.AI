import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createPasswordResetToken, getUserByEmail } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const user = getUserByEmail(normalizedEmail)

    // Always return success to prevent email enumeration
    // But only create token and log if user exists
    if (user) {
      const { token, expiresAt } = createPasswordResetToken(user.id)

      // In development, log the reset link to the console
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'}/reset-password?token=${token}`

      console.log('\n========================================')
      console.log('PASSWORD RESET LINK (Development Mode)')
      console.log('========================================')
      console.log(`Email: ${normalizedEmail}`)
      console.log(`Reset URL: ${resetUrl}`)
      console.log(`Expires: ${expiresAt}`)
      console.log('========================================\n')

      // In production, this would send an email via SendGrid
      // await sendPasswordResetEmail(normalizedEmail, resetUrl)
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
