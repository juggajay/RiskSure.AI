/**
 * Stripe module exports
 */

// Configuration and pricing
export {
  type SubscriptionTier,
  type PricingPlan,
  PRICING_PLANS,
  SUBCONTRACTOR_PLAN,
  TRIAL_CONFIG,
  STRIPE_PRICE_IDS,
  getPlanByTier,
  getStripePriceId,
  formatPrice,
  calculateTotalAnnualCost,
} from './config'

// Server-side utilities (only import in API routes/server components)
export {
  isStripeConfigured,
  getStripe,
  createCheckoutSession,
  createPortalSession,
  createOrGetCustomer,
  getSubscription,
  cancelSubscription,
  reportVendorUsage,
  constructWebhookEvent,
  getCustomerInvoices,
} from './server'

// Client-side utilities
export { getStripeJs, redirectToCheckout, redirectToPortal } from './client'
