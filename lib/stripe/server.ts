/**
 * Server-side Stripe client and utilities
 *
 * Uses Stripe Checkout Sessions API for payment collection
 * and Customer Portal for subscription management.
 */

import Stripe from 'stripe'
import { PRICING_PLANS, getStripeLookupKey, type SubscriptionTier, TRIAL_CONFIG } from './config'

// Check if we're in test/development mode
const isTestMode = process.env.STRIPE_SECRET_KEY === 'test' || !process.env.STRIPE_SECRET_KEY

// Initialize Stripe client (only if we have a real key)
let stripe: Stripe | null = null

if (!isTestMode && process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  })
}

/**
 * Check if Stripe is configured and available
 */
export function isStripeConfigured(): boolean {
  return !isTestMode && stripe !== null
}

/**
 * Get the Stripe client instance
 * Throws if Stripe is not configured
 */
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
  }
  return stripe
}

/**
 * Get price by lookup key
 * This fetches the actual price ID from Stripe using the lookup key
 */
export async function getPriceByLookupKey(lookupKey: string): Promise<string | null> {
  if (isTestMode) {
    console.log('[Stripe Test Mode] Would get price for lookup key:', lookupKey)
    return `price_simulated_${lookupKey}`
  }

  const stripeClient = getStripe()
  const prices = await stripeClient.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  })

  if (!prices.data[0]?.id) {
    console.error(`[Stripe] No price found for lookup key: ${lookupKey}. Make sure you've created prices with this lookup key in your Stripe dashboard.`)
  }

  return prices.data[0]?.id || null
}

interface CreateCheckoutSessionParams {
  customerId?: string
  customerEmail: string
  tier: Exclude<SubscriptionTier, 'trial' | 'subcontractor'>
  billingInterval: 'monthly' | 'annual'
  companyId: string
  successUrl: string
  cancelUrl: string
  trialDays?: number
  promotionCode?: string
}

/**
 * Create a Stripe Checkout Session for subscription signup
 * Uses Stripe-hosted checkout page (recommended by Stripe best practices)
 */
export async function createCheckoutSession({
  customerId,
  customerEmail,
  tier,
  billingInterval,
  companyId,
  successUrl,
  cancelUrl,
  trialDays = TRIAL_CONFIG.durationDays,
  promotionCode,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session | { url: string; isSimulated: true }> {
  // Get the lookup key for the selected tier and billing interval
  const lookupKey = getStripeLookupKey(tier, billingInterval)

  // In test mode, return a simulated session
  if (isTestMode) {
    console.log('[Stripe Test Mode] Would create checkout session:', { customerEmail, tier, billingInterval, lookupKey })
    return {
      url: `${successUrl}?simulated=true&tier=${tier}&interval=${billingInterval}`,
      isSimulated: true,
    }
  }

  const stripeClient = getStripe()

  // Get the price ID from the lookup key
  const priceId = await getPriceByLookupKey(lookupKey)
  if (!priceId) {
    throw new Error(`No price found for lookup key: ${lookupKey}`)
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      companyId,
      tier,
      billingInterval,
    },
    subscription_data: {
      metadata: {
        companyId,
        tier,
        billingInterval,
      },
    },
    // Allow promotion codes for discounts (like FOUNDER50)
    allow_promotion_codes: true,
    // Collect billing address for tax purposes
    billing_address_collection: 'required',
    // Automatic tax calculation (if enabled in Stripe)
    automatic_tax: { enabled: true },
  }

  // Add trial period if applicable (only for monthly to start)
  if (trialDays > 0 && billingInterval === 'monthly') {
    sessionParams.subscription_data!.trial_period_days = trialDays
  }

  // Use existing customer or collect email
  if (customerId) {
    sessionParams.customer = customerId
  } else {
    sessionParams.customer_email = customerEmail
  }

  // Pre-fill promotion code if provided
  if (promotionCode) {
    // Note: For pre-filled promo codes, we'd need to look up the promotion code ID
    // For now, allow_promotion_codes enables manual entry
  }

  return stripeClient.checkout.sessions.create(sessionParams)
}

interface CreatePortalSessionParams {
  customerId: string
  returnUrl: string
}

/**
 * Create a Stripe Customer Portal session for subscription management
 * Allows customers to update payment method, cancel, or change plans
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: CreatePortalSessionParams): Promise<Stripe.BillingPortal.Session | { url: string; isSimulated: true }> {
  // In test mode, return a simulated portal URL
  if (isTestMode) {
    console.log('[Stripe Test Mode] Would create portal session for customer:', customerId)
    return {
      url: `${returnUrl}?portal=simulated`,
      isSimulated: true,
    }
  }

  const stripeClient = getStripe()
  return stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

interface CreateOrGetCustomerParams {
  email: string
  companyId: string
  companyName: string
}

/**
 * Create or retrieve a Stripe customer for a company
 */
export async function createOrGetCustomer({
  email,
  companyId,
  companyName,
}: CreateOrGetCustomerParams): Promise<string> {
  // In test mode, return a simulated customer ID
  if (isTestMode) {
    console.log('[Stripe Test Mode] Would create/get customer:', { email, companyId })
    return `cus_simulated_${companyId}`
  }

  const stripeClient = getStripe()

  // Search for existing customer
  const existingCustomers = await stripeClient.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    // Update metadata if needed
    const customer = existingCustomers.data[0]
    if (customer.metadata.companyId !== companyId) {
      await stripeClient.customers.update(customer.id, {
        metadata: { companyId },
      })
    }
    return customer.id
  }

  // Create new customer
  const customer = await stripeClient.customers.create({
    email,
    name: companyName,
    metadata: {
      companyId,
    },
  })

  return customer.id
}

/**
 * Get subscription details for a customer
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (isTestMode) {
    console.log('[Stripe Test Mode] Would get subscription:', subscriptionId)
    return null
  }

  const stripeClient = getStripe()
  try {
    return await stripeClient.subscriptions.retrieve(subscriptionId)
  } catch {
    return null
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string, immediate = false): Promise<Stripe.Subscription | { status: 'canceled'; isSimulated: true }> {
  if (isTestMode) {
    console.log('[Stripe Test Mode] Would cancel subscription:', subscriptionId)
    return { status: 'canceled', isSimulated: true }
  }

  const stripeClient = getStripe()

  if (immediate) {
    return stripeClient.subscriptions.cancel(subscriptionId)
  }

  // Cancel at period end (more user-friendly)
  return stripeClient.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Report metered usage for per-vendor billing
 * Call this when a new vendor is added to track usage
 *
 * Note: In Stripe's metered billing model, usage records are created
 * through the Billing Meter API or subscription item usage records.
 */
export async function reportVendorUsage(
  subscriptionItemId: string,
  quantity: number,
  _timestamp?: number
): Promise<{ id: string; quantity: number } | { isSimulated: true }> {
  if (isTestMode) {
    console.log('[Stripe Test Mode] Would report usage:', { subscriptionItemId, quantity })
    return { isSimulated: true }
  }

  // For metered billing, we'll update the subscription quantity
  // or use Stripe's usage-based billing when implemented
  const stripeClient = getStripe()

  // Update the subscription item quantity for licensed billing
  // For true metered billing, you would use Stripe Billing Meters
  const updatedItem = await stripeClient.subscriptionItems.update(subscriptionItemId, {
    quantity,
  })

  return { id: updatedItem.id, quantity: updatedItem.quantity || quantity }
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (isTestMode) {
    // In test mode, parse the payload directly
    return JSON.parse(typeof payload === 'string' ? payload : payload.toString())
  }

  const stripeClient = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Get all invoices for a customer
 */
export async function getCustomerInvoices(
  customerId: string,
  limit = 10
): Promise<Stripe.Invoice[] | { invoices: []; isSimulated: true }> {
  if (isTestMode) {
    console.log('[Stripe Test Mode] Would get invoices for customer:', customerId)
    return { invoices: [], isSimulated: true }
  }

  const stripeClient = getStripe()
  const invoices = await stripeClient.invoices.list({
    customer: customerId,
    limit,
  })
  return invoices.data
}
