/**
 * Stripe Configuration - RiskShield AI Pricing
 *
 * Pricing Structure (AUD, GST inclusive):
 * - Velocity: $349/mo | $3,490/yr - Small teams (50 vendors)
 * - Compliance: $799/mo | $7,990/yr - Growing companies (200 vendors)
 * - Business: $1,499/mo | $14,990/yr - Large builders (500 vendors)
 * - Enterprise: Custom - Unlimited everything
 *
 * Stripe Products (Live Mode):
 * - prod_Tlm198CbMwPXPf: RiskShield AI - Velocity
 * - prod_Tlm6oFkgwxbHQD: RiskShield AI - Compliance
 * - prod_TlmBj7BuzNLQS3: RiskShield AI - Business
 * - prod_TlmEGOkUtoOeoU: RiskShield AI - Enterprise
 *
 * Coupon:
 * - FOUNDER50: 50% off for 6 months (20 redemptions max)
 */

export type SubscriptionTier = 'trial' | 'velocity' | 'compliance' | 'business' | 'enterprise' | 'subcontractor'

export interface PricingPlan {
  id: SubscriptionTier
  name: string
  description: string
  priceMonthly: number // Monthly price in cents (AUD)
  priceAnnual: number // Annual price in cents (AUD)
  features: string[]
  vendorLimit: number | null // null = unlimited
  userLimit: number | null // null = unlimited
  projectLimit: number | null // null = unlimited
  recommended?: boolean
  trialDays: number
  stripePriceIdMonthly: string
  stripePriceIdAnnual: string
  stripeProductId: string
}

export const PRICING_PLANS: Record<Exclude<SubscriptionTier, 'trial' | 'subcontractor'>, PricingPlan> = {
  velocity: {
    id: 'velocity',
    name: 'Velocity',
    description: 'Perfect for small teams getting started with compliance automation',
    priceMonthly: 34900, // $349/month
    priceAnnual: 349000, // $3,490/year (save $698)
    features: [
      'Up to 50 active vendors',
      'Up to 3 team members',
      'Up to 5 projects',
      'AI-powered verification',
      'Broker chasing automation',
      'Expiry monitoring & alerts',
      'Email support',
    ],
    vendorLimit: 50,
    userLimit: 3,
    projectLimit: 5,
    trialDays: 14,
    stripePriceIdMonthly: 'velocity_monthly',
    stripePriceIdAnnual: 'velocity_annual',
    stripeProductId: 'prod_Tlm198CbMwPXPf',
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance',
    description: 'For growing companies scaling their vendor network',
    priceMonthly: 79900, // $799/month
    priceAnnual: 799000, // $7,990/year (save $1,598)
    features: [
      'Up to 200 active vendors',
      'Unlimited team members',
      'Unlimited projects',
      'AI-powered verification',
      'Broker chasing automation',
      'Expiry monitoring & alerts',
      'Principal indemnity detection',
      'Fraud detection',
      'Procore integration',
      'Priority support',
    ],
    vendorLimit: 200,
    userLimit: null,
    projectLimit: null,
    recommended: true,
    trialDays: 14,
    stripePriceIdMonthly: 'compliance_monthly',
    stripePriceIdAnnual: 'compliance_annual',
    stripeProductId: 'prod_Tlm6oFkgwxbHQD',
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'Enterprise-grade compliance for large builders',
    priceMonthly: 149900, // $1,499/month
    priceAnnual: 1499000, // $14,990/year (save $2,998)
    features: [
      'Up to 500 active vendors',
      'Unlimited team members',
      'Unlimited projects',
      'AI-powered verification',
      'Broker chasing automation',
      'Expiry monitoring & alerts',
      'Principal indemnity detection',
      'Fraud detection',
      'Procore integration',
      'Advanced reporting',
      'State regulator APIs',
      'Custom compliance rules',
      'Dedicated CSM',
    ],
    vendorLimit: 500,
    userLimit: null,
    projectLimit: null,
    trialDays: 14,
    stripePriceIdMonthly: 'business_monthly',
    stripePriceIdAnnual: 'business_annual',
    stripeProductId: 'prod_TlmBj7BuzNLQS3',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions with unlimited capabilities',
    priceMonthly: 0, // Custom pricing
    priceAnnual: 0, // Custom pricing
    features: [
      'Unlimited vendors',
      'Unlimited team members',
      'Unlimited projects',
      'All Business features',
      'SLA guarantee',
      'Custom integrations',
      'On-premise option',
      'White-glove onboarding',
      'Dedicated support team',
    ],
    vendorLimit: null,
    userLimit: null,
    projectLimit: null,
    trialDays: 14,
    stripePriceIdMonthly: 'enterprise_monthly',
    stripePriceIdAnnual: 'enterprise_annual',
    stripeProductId: 'prod_TlmEGOkUtoOeoU',
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
  tier: 'compliance' as const, // Trial gets Compliance tier features
  vendorLimit: 50, // But limited to 50 vendors during trial
  features: [
    'Full access to Compliance features',
    'Up to 50 vendors during trial',
    'No credit card required to start',
  ],
}

// Founder coupon configuration
export const FOUNDER_COUPON = {
  code: 'FOUNDER50',
  percentOff: 50,
  durationMonths: 6,
  maxRedemptions: 20,
  couponId: 'k91aNxFP',
}

/**
 * Get pricing plan by tier ID
 */
export function getPlanByTier(tier: SubscriptionTier): PricingPlan | typeof SUBCONTRACTOR_PLAN | null {
  if (tier === 'trial') {
    return null // Trial uses Compliance features with limited vendors
  }
  if (tier === 'subcontractor') {
    return SUBCONTRACTOR_PLAN
  }
  return PRICING_PLANS[tier] || null
}

/**
 * Get vendor limit for a subscription tier
 */
export function getVendorLimit(tier: SubscriptionTier): number | null {
  if (tier === 'trial') {
    return TRIAL_CONFIG.vendorLimit
  }
  if (tier === 'subcontractor') {
    return 0 // Subcontractors don't have vendors
  }
  const plan = PRICING_PLANS[tier as keyof typeof PRICING_PLANS]
  return plan?.vendorLimit ?? null
}

/**
 * Get user limit for a subscription tier
 */
export function getUserLimit(tier: SubscriptionTier): number | null {
  if (tier === 'trial' || tier === 'subcontractor') {
    return 3 // Trial gets 3 users
  }
  const plan = PRICING_PLANS[tier as keyof typeof PRICING_PLANS]
  return plan?.userLimit ?? null
}

/**
 * Get project limit for a subscription tier
 */
export function getProjectLimit(tier: SubscriptionTier): number | null {
  if (tier === 'trial') {
    return 5 // Trial gets 5 projects
  }
  if (tier === 'subcontractor') {
    return 0 // Subcontractors don't have projects
  }
  const plan = PRICING_PLANS[tier as keyof typeof PRICING_PLANS]
  return plan?.projectLimit ?? null
}

/**
 * Check if vendor limit is exceeded
 */
export function isVendorLimitExceeded(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = getVendorLimit(tier)
  if (limit === null) return false // Unlimited
  return currentCount >= limit
}

/**
 * Get vendor limit usage info
 */
export function getVendorLimitInfo(tier: SubscriptionTier, currentCount: number): {
  limit: number | null
  current: number
  remaining: number | null
  percentUsed: number
  isAtLimit: boolean
  isNearLimit: boolean // 80% or more used
} {
  const limit = getVendorLimit(tier)

  if (limit === null) {
    return {
      limit: null,
      current: currentCount,
      remaining: null,
      percentUsed: 0,
      isAtLimit: false,
      isNearLimit: false,
    }
  }

  const remaining = Math.max(0, limit - currentCount)
  const percentUsed = Math.round((currentCount / limit) * 100)

  return {
    limit,
    current: currentCount,
    remaining,
    percentUsed,
    isAtLimit: currentCount >= limit,
    isNearLimit: percentUsed >= 80,
  }
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
 * Get annual savings compared to monthly
 */
export function getAnnualSavings(tier: Exclude<SubscriptionTier, 'trial' | 'subcontractor'>): number {
  const plan = PRICING_PLANS[tier]
  const monthlyTotal = plan.priceMonthly * 12
  return monthlyTotal - plan.priceAnnual
}

/**
 * Stripe lookup keys for prices
 * These are used to fetch prices dynamically from Stripe
 */
export const STRIPE_LOOKUP_KEYS = {
  velocity: {
    monthly: 'velocity_monthly',
    annual: 'velocity_annual',
  },
  compliance: {
    monthly: 'compliance_monthly',
    annual: 'compliance_annual',
  },
  business: {
    monthly: 'business_monthly',
    annual: 'business_annual',
  },
  enterprise: {
    monthly: 'enterprise_monthly',
    annual: 'enterprise_annual',
  },
}

/**
 * Get Stripe lookup key for a tier and billing interval
 */
export function getStripeLookupKey(
  tier: Exclude<SubscriptionTier, 'trial' | 'subcontractor'>,
  interval: 'monthly' | 'annual'
): string {
  return STRIPE_LOOKUP_KEYS[tier][interval]
}

/**
 * Get suggested upgrade tier based on current usage
 */
export function getSuggestedUpgrade(
  currentTier: SubscriptionTier,
  vendorCount: number,
  userCount: number,
  projectCount: number
): SubscriptionTier | null {
  const tiers: Array<Exclude<SubscriptionTier, 'trial' | 'subcontractor'>> = ['velocity', 'compliance', 'business', 'enterprise']
  const currentIndex = tiers.indexOf(currentTier as typeof tiers[number])

  // Check each tier from current+1 onwards
  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tier = tiers[i]
    const plan = PRICING_PLANS[tier]

    const vendorOk = plan.vendorLimit === null || vendorCount <= plan.vendorLimit
    const userOk = plan.userLimit === null || userCount <= plan.userLimit
    const projectOk = plan.projectLimit === null || projectCount <= plan.projectLimit

    if (vendorOk && userOk && projectOk) {
      return tier
    }
  }

  return 'enterprise' // Default to enterprise if nothing else fits
}
