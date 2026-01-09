/**
 * Client-side Stripe utilities
 *
 * Provides the Stripe.js instance for client-side operations
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get the Stripe.js instance (singleton)
 * Returns null if Stripe is not configured (test mode)
 */
export function getStripeJs(): Promise<Stripe | null> {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  // In test mode, return null
  if (!publishableKey || publishableKey === 'test') {
    return Promise.resolve(null)
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}

/**
 * Redirect to Stripe Checkout
 * Uses the checkout session URL returned from our API
 */
export async function redirectToCheckout(sessionUrl: string): Promise<void> {
  window.location.href = sessionUrl
}

/**
 * Redirect to Stripe Customer Portal
 */
export async function redirectToPortal(portalUrl: string): Promise<void> {
  window.location.href = portalUrl
}
