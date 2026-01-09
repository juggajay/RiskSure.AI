import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { constructWebhookEvent, isStripeConfigured } from '@/lib/stripe'
import Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler for subscription lifecycle events
 *
 * Handles:
 * - checkout.session.completed: Initial subscription created
 * - customer.subscription.created: Subscription started
 * - customer.subscription.updated: Plan changed, trial ended, etc.
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.paid: Successful payment
 * - invoice.payment_failed: Payment failed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    // In test mode without signature, allow for testing
    if (!isStripeConfigured()) {
      console.log('[Stripe Test Mode] Webhook received (not verified)')

      // Parse the test payload
      let event
      try {
        event = JSON.parse(body)
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
      }

      // Process in test mode
      await processStripeEvent(event, true)

      return NextResponse.json({ received: true, testMode: true })
    }

    // Production mode - verify signature
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = constructWebhookEvent(body, signature)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Process the event
    await processStripeEvent(event, false)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Process a Stripe event and update the database accordingly
 */
async function processStripeEvent(event: Stripe.Event, isTestMode: boolean) {
  const db = getDb()

  // Log the event
  const eventLogId = uuidv4()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const companyId = session.metadata?.companyId
      const tier = session.metadata?.tier

      if (companyId && tier) {
        // Update company subscription status
        db.prepare(`
          UPDATE companies SET
            subscription_tier = ?,
            subscription_status = 'active',
            stripe_subscription_id = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(tier, session.subscription, companyId)

        // Log billing event
        db.prepare(`
          INSERT INTO billing_events (id, company_id, stripe_event_id, event_type, details)
          VALUES (?, ?, ?, ?, ?)
        `).run(eventLogId, companyId, event.id, 'checkout_completed', JSON.stringify({
          tier,
          subscription_id: session.subscription,
          customer_id: session.customer,
          test_mode: isTestMode,
        }))

        console.log(`[Stripe] Checkout completed for company ${companyId}, tier: ${tier}`)
      }
      break
    }

    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription
      const companyId = subscription.metadata?.companyId
      const tier = subscription.metadata?.tier

      if (companyId) {
        const status = subscription.status === 'trialing' ? 'trialing' : 'active'

        // Access period end safely - it may be on the subscription object
        const periodEnd = (subscription as { current_period_end?: number }).current_period_end

        db.prepare(`
          UPDATE companies SET
            subscription_tier = ?,
            subscription_status = ?,
            stripe_subscription_id = ?,
            subscription_period_end = ?,
            trial_ends_at = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          tier || 'professional',
          status,
          subscription.id,
          periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          companyId
        )

        // Log billing event
        db.prepare(`
          INSERT INTO billing_events (id, company_id, stripe_event_id, event_type, details)
          VALUES (?, ?, ?, ?, ?)
        `).run(eventLogId, companyId, event.id, 'subscription_created', JSON.stringify({
          tier,
          status,
          subscription_id: subscription.id,
          trial_end: subscription.trial_end,
          test_mode: isTestMode,
        }))

        console.log(`[Stripe] Subscription created for company ${companyId}`)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const companyId = subscription.metadata?.companyId

      if (companyId) {
        // Map Stripe status to our status
        let status: string
        switch (subscription.status) {
          case 'active':
            status = 'active'
            break
          case 'trialing':
            status = 'trialing'
            break
          case 'past_due':
            status = 'past_due'
            break
          case 'canceled':
            status = 'canceled'
            break
          case 'unpaid':
            status = 'unpaid'
            break
          default:
            status = 'inactive'
        }

        // Get the tier from the subscription item's price
        let tier = subscription.metadata?.tier
        if (!tier && subscription.items?.data?.[0]?.price?.metadata?.tier) {
          tier = subscription.items.data[0].price.metadata.tier
        }

        // Access period end safely
        const periodEnd = (subscription as { current_period_end?: number }).current_period_end

        db.prepare(`
          UPDATE companies SET
            subscription_tier = COALESCE(?, subscription_tier),
            subscription_status = ?,
            subscription_period_end = ?,
            trial_ends_at = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          tier,
          status,
          periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          companyId
        )

        // Log billing event
        db.prepare(`
          INSERT INTO billing_events (id, company_id, stripe_event_id, event_type, details)
          VALUES (?, ?, ?, ?, ?)
        `).run(eventLogId, companyId, event.id, 'subscription_updated', JSON.stringify({
          status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          test_mode: isTestMode,
        }))

        console.log(`[Stripe] Subscription updated for company ${companyId}, status: ${status}`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const companyId = subscription.metadata?.companyId

      if (companyId) {
        // Downgrade to trial/free
        db.prepare(`
          UPDATE companies SET
            subscription_tier = 'trial',
            subscription_status = 'canceled',
            stripe_subscription_id = NULL,
            subscription_period_end = NULL,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(companyId)

        // Log billing event
        db.prepare(`
          INSERT INTO billing_events (id, company_id, stripe_event_id, event_type, details)
          VALUES (?, ?, ?, ?, ?)
        `).run(eventLogId, companyId, event.id, 'subscription_deleted', JSON.stringify({
          subscription_id: subscription.id,
          test_mode: isTestMode,
        }))

        console.log(`[Stripe] Subscription canceled for company ${companyId}`)
      }
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

      if (customerId) {
        // Find company by Stripe customer ID
        const company = db.prepare(`
          SELECT id FROM companies WHERE stripe_customer_id = ?
        `).get(customerId) as { id: string } | undefined

        if (company) {
          // Ensure subscription is active
          db.prepare(`
            UPDATE companies SET
              subscription_status = 'active',
              updated_at = datetime('now')
            WHERE id = ? AND subscription_status IN ('past_due', 'unpaid')
          `).run(company.id)

          // Log billing event
          db.prepare(`
            INSERT INTO billing_events (id, company_id, stripe_event_id, event_type, details)
            VALUES (?, ?, ?, ?, ?)
          `).run(eventLogId, company.id, event.id, 'invoice_paid', JSON.stringify({
            amount: invoice.amount_paid,
            currency: invoice.currency,
            invoice_id: invoice.id,
            test_mode: isTestMode,
          }))

          console.log(`[Stripe] Invoice paid for company ${company.id}`)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

      if (customerId) {
        // Find company by Stripe customer ID
        const company = db.prepare(`
          SELECT id FROM companies WHERE stripe_customer_id = ?
        `).get(customerId) as { id: string } | undefined

        if (company) {
          // Mark subscription as past due
          db.prepare(`
            UPDATE companies SET
              subscription_status = 'past_due',
              updated_at = datetime('now')
            WHERE id = ?
          `).run(company.id)

          // Log billing event
          db.prepare(`
            INSERT INTO billing_events (id, company_id, stripe_event_id, event_type, details)
            VALUES (?, ?, ?, ?, ?)
          `).run(eventLogId, company.id, event.id, 'payment_failed', JSON.stringify({
            amount: invoice.amount_due,
            currency: invoice.currency,
            invoice_id: invoice.id,
            attempt_count: invoice.attempt_count,
            test_mode: isTestMode,
          }))

          console.log(`[Stripe] Payment failed for company ${company.id}`)

          // TODO: Send email notification about failed payment
        }
      }
      break
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`)
  }
}
