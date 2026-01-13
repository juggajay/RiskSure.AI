import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'
import { hashPassword, validatePassword } from '@/lib/auth'
import { authLimiter, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Security: Rate limiting to prevent brute force attacks
  const rateLimitResult = authLimiter.check(request, 'reset-password')
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

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

    const convex = getConvex()

    // Security: Atomically validate and mark the token as used in one operation
    // This prevents race conditions where two requests could both validate the same token
    const markResult = await convex.mutation(api.auth.markPasswordResetTokenUsed, { token })

    if (!markResult.success || !markResult.userId) {
      // Token was invalid, already used, or expired
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    const userId = markResult.userId

    // Hash and update the password
    const passwordHash = await hashPassword(password)
    await convex.mutation(api.users.updatePassword, {
      id: userId,
      passwordHash,
    })

    // Delete all existing sessions for this user (security measure)
    await convex.mutation(api.auth.deleteUserSessions, { userId })

    // Security: Only log sensitive operations in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================')
      console.log('PASSWORD RESET SUCCESSFUL')
      console.log('========================================')
      console.log(`User ID: ${userId}`)
      console.log('Password has been updated and all sessions invalidated.')
      console.log('========================================\n')
    }

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
