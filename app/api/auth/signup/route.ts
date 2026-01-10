import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { getConvex, api } from '@/lib/convex'
import { hashPassword, validatePassword, getJwtSecret } from '@/lib/auth'
import { isValidABN } from '@/lib/utils'
import { authLimiter, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResult = authLimiter.check(request, 'signup')
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  try {
    const body = await request.json()
    const { email, password, name, companyName, abn } = body

    // Validate required fields
    if (!email || !password || !name || !companyName || !abn) {
      return NextResponse.json(
        { error: 'All fields are required: email, password, name, companyName, abn' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      )
    }

    // Validate ABN format
    const cleanedABN = abn.replace(/\s/g, '')
    if (!isValidABN(cleanedABN)) {
      return NextResponse.json(
        { error: 'Invalid ABN format. ABN must be 11 digits.' },
        { status: 400 }
      )
    }

    const convex = getConvex()

    // Check if email already exists
    const existingUser = await convex.query(api.users.getByEmail, {
      email: email.toLowerCase(),
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Check if ABN already exists
    const existingCompany = await convex.query(api.companies.getByAbn, {
      abn: cleanedABN,
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: 'A company with this ABN already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)
    const forwardingEmail = `coc-${uuidv4().split('-')[0]}@riskshield.ai`

    // Create company
    const companyId = await convex.mutation(api.companies.create, {
      name: companyName.trim(),
      abn: cleanedABN,
      forwardingEmail,
      primaryContactName: name.trim(),
      primaryContactEmail: email.toLowerCase(),
      subscriptionTier: 'trial',
      subscriptionStatus: 'active',
    })

    // Create user with admin role
    const userId = await convex.mutation(api.users.create, {
      companyId,
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      role: 'admin',
    })

    // Create session - generate JWT token
    const sessionId = uuidv4()
    const sessionToken = jwt.sign(
      { sessionId, userId },
      getJwtSecret(),
      { algorithm: 'HS256', expiresIn: '8h' }
    )
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000 // 8 hours

    // Store session in Convex
    await convex.mutation(api.auth.createSession, {
      userId,
      token: sessionToken,
      expiresAt,
    })

    // Log the actions
    await convex.mutation(api.auditLogs.create, {
      companyId,
      userId,
      entityType: 'company',
      entityId: companyId,
      action: 'create',
      details: { companyName, abn: cleanedABN },
    })

    await convex.mutation(api.auditLogs.create, {
      companyId,
      userId,
      entityType: 'user',
      entityId: userId,
      action: 'signup',
      details: { email: email.toLowerCase(), role: 'admin' },
    })

    // Return success response with token
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: name.trim(),
        role: 'admin',
        company: {
          id: companyId,
          name: companyName.trim(),
          abn: cleanedABN
        }
      }
    }, { status: 201 })

    // Set auth cookie
    response.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
