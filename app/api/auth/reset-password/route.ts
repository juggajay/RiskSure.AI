import { NextResponse } from 'next/server'
import { validatePasswordResetToken, usePasswordResetToken, updateUserPassword, validatePassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Validate password requirements
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      )
    }

    // Validate the reset token
    const tokenValidation = validatePasswordResetToken(token)
    if (!tokenValidation.valid || !tokenValidation.userId) {
      return NextResponse.json(
        { error: tokenValidation.error || 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    // Update the password
    await updateUserPassword(tokenValidation.userId, password)

    // Mark the token as used
    usePasswordResetToken(token)

    console.log('\n========================================')
    console.log('PASSWORD RESET SUCCESSFUL')
    console.log('========================================')
    console.log(`User ID: ${tokenValidation.userId}`)
    console.log('Password has been updated and all sessions invalidated.')
    console.log('========================================\n')

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
