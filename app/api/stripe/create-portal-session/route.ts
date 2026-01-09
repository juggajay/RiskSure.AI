import { NextRequest, NextResponse } from 'next/server'
import { getDb, type Company } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { createPortalSession, isStripeConfigured } from '@/lib/stripe'

/**
 * POST /api/stripe/create-portal-session
 *
 * Create a Stripe Customer Portal session for subscription management
 * Allows customers to:
 * - Update payment method
 * - Cancel subscription
 * - View invoices
 * - Change plan (if configured)
 */
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

    // Only admin can manage billing
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can manage billing' },
        { status: 403 }
      )
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 404 }
      )
    }

    const db = getDb()
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(user.company_id) as Company & {
      stripe_customer_id?: string
    } | undefined

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const returnUrl = `${appUrl}/dashboard/settings/billing`

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      // Simulated mode
      console.log('[Stripe Test Mode] Simulating portal session creation')

      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Stripe Customer Portal not available in test mode',
        portalUrl: returnUrl,
      })
    }

    // Production mode - create actual portal session
    if (!company.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 400 }
      )
    }

    const session = await createPortalSession({
      customerId: company.stripe_customer_id,
      returnUrl,
    })

    // Log the action
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'subscription', ?, 'access_portal', ?)
    `).run(uuidv4(), user.company_id, user.id, user.company_id, JSON.stringify({
      stripe_customer_id: company.stripe_customer_id,
    }))

    const portalUrl = 'url' in session ? session.url : null

    if (!portalUrl) {
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      portalUrl,
    })
  } catch (error) {
    console.error('Create portal session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
