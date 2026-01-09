/**
 * Stripe Configuration - Hybrid Shield Pricing Model
 *
 * Pricing Structure:
 * - Starter: $349/year - Small contractors (up to 25 vendors)
 * - Professional: $999/year - Growing companies (up to 100 vendors)
 * - Enterprise: $1,999/year - Large organizations (unlimited vendors)
 *
 * Per-Vendor Fees: $19-29/year based on tier
 * Free Trial: 14 days
 * Free for Subcontractors: No charge for invited subcontractors
 */

export type SubscriptionTier = 'trial' | 'starter' | 'professional' | 'enterprise' | 'subcontractor'

export interface PricingPlan {
  id: SubscriptionTier
  name: string
  description: string
  price: number // Annual price in cents
  priceMonthly: number // Monthly equivalent for display
  features: string[]
  vendorLimit: number | null // null = unlimited
  vendorFee: number // Per-vendor annual fee in cents
  projectLimit: number | null // null = unlimited
  recommended?: boolean
  trialDays: number
}

export const PRICING_PLANS: Record<Exclude<SubscriptionTier, 'trial' | 'subcontractor'>, PricingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For small contractors getting started with compliance management',
    price: 34900, // $349/year
    priceMonthly: 2908, // ~$29/month equivalent
    features: [
      'Up to 25 active vendors',
      'Up to 10 projects',
      'AI-powered document verification',
      'Email notifications & reminders',
      'Basic compliance dashboard',
      'Email support',
      '60-80% admin time reduction',
    ],
    vendorLimit: 25,
    vendorFee: 1900, // $19/vendor/year
    projectLimit: 10,
    trialDays: 14,
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing construction companies with expanding vendor networks',
    price: 99900, // $999/year
    priceMonthly: 8325, // ~$83/month equivalent
    features: [
      'Up to 100 active vendors',
      'Unlimited projects',
      'AI-powered document verification',
      'Email & SMS notifications',
      'Advanced analytics & reporting',
      'Risk scoring & alerts',
      'Priority support',
      'API access',
      'Prevents six-figure liability exposure',
    ],
    vendorLimit: 100,
    vendorFee: 2400, // $24/vendor/year
    projectLimit: null,
    recommended: true,
    trialDays: 14,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations requiring maximum compliance coverage',
    price: 199900, // $1,999/year
    priceMonthly: 16658, // ~$167/month equivalent
    features: [
      'Unlimited vendors',
      'Unlimited projects',
      'AI-powered document verification',
      'All notification channels',
      'Custom reporting & exports',
      'Advanced risk analytics',
      'Dedicated account manager',
      'Custom integrations & SSO',
      'SLA guarantee',
      'White-glove onboarding',
    ],
    vendorLimit: null,
    vendorFee: 2900, // $29/vendor/year (for metered billing purposes)
    projectLimit: null,
    trialDays: 14,
  },
}

// Free tier for subcontractors - they don't pay
export const SUBCONTRACTOR_PLAN = {
  id: 'subcontractor' as const,
  name: 'Subcontractor (Free)',
  description: 'Free access for invited subcontractors',
  price: 0,
  features: [
    'View compliance requirements',
    'Upload certificates & documents',
    'Receive expiry notifications',
    'Track compliance status',
    'Access from any device',
  ],
}

// Trial configuration
export const TRIAL_CONFIG = {
  durationDays: 14,
  features: [
    'Full access to Professional features',
    'Up to 50 vendors during trial',
    'No credit card required to start',
  ],
}

/**
 * Get pricing plan by tier ID
 */
export function getPlanByTier(tier: SubscriptionTier): PricingPlan | typeof SUBCONTRACTOR_PLAN | null {
  if (tier === 'trial') {
    return null // Trial uses Professional features
  }
  if (tier === 'subcontractor') {
    return SUBCONTRACTOR_PLAN
  }
  return PRICING_PLANS[tier] || null
}

/**
 * Format price for display
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Calculate total annual cost including vendor fees
 */
export function calculateTotalAnnualCost(tier: Exclude<SubscriptionTier, 'trial' | 'subcontractor'>, vendorCount: number): number {
  const plan = PRICING_PLANS[tier]
  const basePrice = plan.price
  const vendorFees = vendorCount * plan.vendorFee
  return basePrice + vendorFees
}

/**
 * Stripe Price IDs - These need to be created in your Stripe Dashboard
 * and the IDs added here. For development, we use placeholder values.
 *
 * To create these in Stripe:
 * 1. Go to Products in your Stripe Dashboard
 * 2. Create a product for each tier
 * 3. Add a recurring price (yearly) to each product
 * 4. Copy the price IDs (price_xxx) and add them below
 */
export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_ID_STARTER || 'price_starter_placeholder',
  professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_professional_placeholder',
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise_placeholder',
  // Metered prices for per-vendor billing
  vendorFee: {
    starter: process.env.STRIPE_PRICE_ID_VENDOR_STARTER || 'price_vendor_starter_placeholder',
    professional: process.env.STRIPE_PRICE_ID_VENDOR_PROFESSIONAL || 'price_vendor_professional_placeholder',
    enterprise: process.env.STRIPE_PRICE_ID_VENDOR_ENTERPRISE || 'price_vendor_enterprise_placeholder',
  },
}

/**
 * Get Stripe price ID for a subscription tier
 */
export function getStripePriceId(tier: Exclude<SubscriptionTier, 'trial' | 'subcontractor'>): string {
  return STRIPE_PRICE_IDS[tier]
}
