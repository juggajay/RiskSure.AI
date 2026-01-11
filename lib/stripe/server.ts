/**
 * Server-side Stripe utilities
 *
 * Uses raw fetch API for Vercel compatibility (Stripe SDK v20 has issues)
 * Implements Stripe Checkout Sessions API for payment collection
 * and Customer Portal for subscription management.
 */

import Stripe from 'stripe'
import { PRICING_PLANS, getStripeLookupKey, type SubscriptionTier, TRIAL_CONFIG } from './config'

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

/**
 * Check if we're in test/development mode
 */
function isTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY === 'test' || !process.env.STRIPE_SECRET_KEY
}

/**
 * Check if Stripe is configured and available
 */
export function isStripeConfigured(): boolean {
  return !isTestMode() && !!process.env.STRIPE_SECRET_KEY
}

/**
 * Make a raw Stripe API request
 */
async function stripeRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const apiKey = process.env.STRIPE_SECRET_KEY!

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Stripe-Version': '2024-12-18.acacia',
  }

  let requestBody: string | undefined
  if (body && method === 'POST') {
    // Convert nested objects to Stripe's bracket notation
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        params.append(key, String(value))
      }
    }
    requestBody = params.toString()
  }

  const response = await fetch(`${STRIPE_API_BASE}${endpoint}`, {
    method,
    headers,
    body: requestBody,
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.error?.message || 'Stripe API error') as Error & {
      type?: string
      code?: string
      statusCode?: number
    }
    error.type = data.error?.type
    error.code = data.error?.code
    error.statusCode = response.status
    throw error
  }

  return data as T
}

/**
 * Get the Stripe client instance (for webhook signature verification only)
 */
export function getStripe(): Stripe {
  if (isTestMode()) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
  }
  // Only used for webhook signature verification
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  })
}

/**
 * Get price by lookup key
 * This fetches the actual price ID from Stripe using the lookup key
 */
export async function getPriceByLookupKey(lookupKey: string): Promise<string | null> {
  if (isTestMode()) {
    console.log('[Stripe Test Mode] Would get price for lookup key:', lookupKey)
    return `price_simulated_${lookupKey}`
  }

  const data = await stripeRequest<{ data: Array<{ id: string }> }>(
    `/prices?lookup_keys[]=${encodeURIComponent(lookupKey)}&limit=1`
  )

  if (!data.data[0]?.id) {
    console.error(`[Stripe] No price found for lookup key: ${lookupKey}. Make sure you've created prices with this lookup key in your Stripe dashboard.`)
  }

  return data.data[0]?.id || null
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
}: CreateCheckoutSessionParams): Promise<{ url: string } | { url: string; isSimulated: true }> {
  // Get the lookup key for the selected tier and billing interval
  const lookupKey = getStripeLookupKey(tier, billingInterval)

  // In test mode, return a simulated session
  if (isTestMode()) {
    console.log('[Stripe Test Mode] Would create checkout session:', { customerEmail, tier, billingInterval, lookupKey })
    return {
      url: `${successUrl}?simulated=true&tier=${tier}&interval=${billingInterval}`,
      isSimulated: true,
    }
  }

  // Get the price ID from the lookup key
  const priceId = await getPriceByLookupKey(lookupKey)
  if (!priceId) {
    throw new Error(`No price found for lookup key: ${lookupKey}`)
  }

  // Build form data for Stripe API
  const params = new URLSearchParams()
  params.append('mode', 'subscription')
  params.append('line_items[0][price]', priceId)
  params.append('line_items[0][quantity]', '1')
  params.append('success_url', `${successUrl}?session_id={CHECKOUT_SESSION_ID}`)
  params.append('cancel_url', cancelUrl)
  params.append('metadata[companyId]', companyId)
  params.append('metadata[tier]', tier)
  params.append('metadata[billingInterval]', billingInterval)
  params.append('subscription_data[metadata][companyId]', companyId)
  params.append('subscription_data[metadata][tier]', tier)
  params.append('subscription_data[metadata][billingInterval]', billingInterval)
  params.append('allow_promotion_codes', 'true')

  // Add trial period if applicable (only for monthly to start)
  if (trialDays > 0 && billingInterval === 'monthly') {
    params.append('subscription_data[trial_period_days]', String(trialDays))
  }

  // Use existing customer or collect email
  if (customerId) {
    params.append('customer', customerId)
  } else {
    params.append('customer_email', customerEmail)
  }

  const apiKey = process.env.STRIPE_SECRET_KEY!
  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-12-18.acacia',
    },
    body: params.toString(),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create checkout session')
  }

  return { url: data.url }
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
}: CreatePortalSessionParams): Promise<{ url: string } | { url: string; isSimulated: true }> {
  // In test mode, return a simulated portal URL
  if (isTestMode()) {
    console.log('[Stripe Test Mode] Would create portal session for customer:', customerId)
    return {
      url: `${returnUrl}?portal=simulated`,
      isSimulated: true,
    }
  }

  const session = await stripeRequest<{ url: string }>(
    '/billing_portal/sessions',
    'POST',
    {
      customer: customerId,
      return_url: returnUrl,
    }
  )

  return { url: session.url }
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
  if (isTestMode()) {
    console.log('[Stripe Test Mode] Would create/get customer:', { email, companyId })
    return `cus_simulated_${companyId}`
  }

  // Search for existing customer by email
  const searchData = await stripeRequest<{ data: Array<{ id: string; metadata: Record<string, string> }> }>(
    `/customers?email=${encodeURIComponent(email)}&limit=1`
  )

  if (searchData.data.length > 0) {
    // Update metadata if needed
    const customer = searchData.data[0]
    if (customer.metadata.companyId !== companyId) {
      await stripeRequest<{ id: string }>(
        `/customers/${customer.id}`,
        'POST',
        { 'metadata[companyId]': companyId }
      )
    }
    return customer.id
  }

  // Create new customer
  const newCustomer = await stripeRequest<{ id: string }>(
    '/customers',
    'POST',
    {
      email,
      name: companyName,
      'metadata[companyId]': companyId,
    }
  )

  return newCustomer.id
}

interface StripeSubscription {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  metadata: Record<string, string>
  items: {
    data: Array<{
      id: string
      price: { id: string; lookup_key: string | null }
      quantity: number
    }>
  }
}

/**
 * Get subscription details for a customer
 */
export async function getSubscription(subscriptionId: string): Promise<StripeSubscription | null> {
  if (isTestMode()) {
    console.log('[Stripe Test Mode] Would get subscription:', subscriptionId)
    return null
  }

  try {
    return await stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`)
  } catch {
    return null
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string, immediate = false): Promise<StripeSubscription | { status: 'canceled'; isSimulated: true }> {
  if (isTestMode()) {
    console.log('[Stripe Test Mode] Would cancel subscription:', subscriptionId)
    return { status: 'canceled', isSimulated: true }
  }

  if (immediate) {
    return await stripeRequest<StripeSubscription>(
      `/subscriptions/${subscriptionId}`,
      'DELETE'
    )
  }

  // Cancel at period end (more user-friendly)
  return await stripeRequest<StripeSubscription>(
    `/subscriptions/${subscriptionId}`,
    'POST',
    { cancel_at_period_end: true }
  )
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
  if (isTestMode()) {
    console.log('[Stripe Test Mode] Would report usage:', { subscriptionItemId, quantity })
    return { isSimulated: true }
  }

  // Update the subscription item quantity for licensed billing
  // For true metered billing, you would use Stripe Billing Meters
  const updatedItem = await stripeRequest<{ id: string; quantity: number }>(
    `/subscription_items/${subscriptionItemId}`,
    'POST',
    { quantity }
  )

  return { id: updatedItem.id, quantity: updatedItem.quantity || quantity }
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (isTestMode()) {
    // In test mode, parse the payload directly
    return JSON.parse(typeof payload === 'string' ? payload : payload.toString())
  }

  const stripeClient = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret)
}

interface StripeInvoice {
  id: string
  status: string
  amount_due: number
  amount_paid: number
  currency: string
  created: number
  period_start: number
  period_end: number
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

/**
 * Get all invoices for a customer
 */
export async function getCustomerInvoices(
  customerId: string,
  limit = 10
): Promise<StripeInvoice[] | { invoices: []; isSimulated: true }> {
  if (isTestMode()) {
    console.log('[Stripe Test Mode] Would get invoices for customer:', customerId)
    return { invoices: [], isSimulated: true }
  }

  const data = await stripeRequest<{ data: StripeInvoice[] }>(
    `/invoices?customer=${encodeURIComponent(customerId)}&limit=${limit}`
  )
  return data.data
}
