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
  FOUNDER_COUPON,
  STRIPE_LOOKUP_KEYS,
  getPlanByTier,
  getVendorLimit,
  getUserLimit,
  getProjectLimit,
  isVendorLimitExceeded,
  getVendorLimitInfo,
  formatPrice,
  getAnnualSavings,
  getStripeLookupKey,
  getSuggestedUpgrade,
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
  getPriceByLookupKey,
} from './server'

// Client-side utilities
export { getStripeJs, redirectToCheckout, redirectToPortal } from './client'
