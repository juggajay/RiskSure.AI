/**
 * Stripe Configuration - RiskShield AI Pricing
 *
 * Pricing Structure (AUD, GST inclusive):
 * - Starter: $349/mo (annual) | $399/mo (monthly) - 75 subcontractors
 * - Professional: $999/mo (annual) | $1,199/mo (monthly) - 250 subcontractors
 * - Business: Contact Sales - Unlimited subcontractors
 *
 * Stripe Products (Live Mode):
 * - prod_Tlm198CbMwPXPf: RiskShield AI - Starter
 * - prod_Tlm6oFkgwxbHQD: RiskShield AI - Professional
 * - prod_TlmBj7BuzNLQS3: RiskShield AI - Business
 *
 * Coupon:
 * - FOUNDER50: 50% off for 6 months (20 redemptions max)
 */

export type SubscriptionTier = 'trial' | 'starter' | 'professional' | 'business' | 'subcontractor'

export interface PricingPlan {
  id: SubscriptionTier
  name: string
  description: string
  priceMonthly: number // Monthly price in cents (AUD)
  priceAnnual: number // Annual price in cents (AUD)
  features: string[]
  subcontractorLimit: number | null // null = unlimited
  userLimit: number | null // null = unlimited
  projectLimit: number | null // null = unlimited
  recommended?: boolean
  trialDays: number
  stripePriceIdMonthly: string
  stripePriceIdAnnual: string
  stripeProductId: string
}

export const PRICING_PLANS: Record<Exclude<SubscriptionTier, 'trial' | 'subcontractor'>, PricingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams getting started with compliance automation',
    priceMonthly: 39900, // $399/month
    priceAnnual: 418800, // $349/month billed annually ($4,188/year)
    features: [
      'Up to 75 active subcontractors',
      'Up to 3 team members',
      'Up to 5 projects',
      'AI-powered document verification',
      'Automated broker chasing',
      'Real-time compliance dashboard',
      'Expiry monitoring & alerts',
      'Email support',
    ],
    subcontractorLimit: 75,
    userLimit: 3,
    projectLimit: 5,
    trialDays: 14,
    stripePriceIdMonthly: 'starter_monthly',
    stripePriceIdAnnual: 'starter_annual',
    stripeProductId: 'prod_Tlm198CbMwPXPf',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing companies scaling their subcontractor network',
    priceMonthly: 119900, // $1,199/month
    priceAnnual: 1198800, // $999/month billed annually ($11,988/year)
    features: [
      'Up to 250 active subcontractors',
      'Unlimited team members',
      'Unlimited projects',
      'AI-powered document verification',
      'Automated broker chasing',
      'Real-time compliance dashboard',
      'Expiry monitoring & alerts',
      'Custom compliance rules',
      'Principal indemnity detection',
      'Fraud detection',
      'Procore integration',
      'Priority support',
    ],
    subcontractorLimit: 250,
    userLimit: null,
    projectLimit: null,
    recommended: true,
    trialDays: 14,
    stripePriceIdMonthly: 'professional_monthly',
    stripePriceIdAnnual: 'professional_annual',
    stripeProductId: 'prod_Tlm6oFkgwxbHQD',
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'Enterprise-grade compliance for large builders',
    priceMonthly: 0, // Contact sales
    priceAnnual: 0, // Contact sales
    features: [
      'Unlimited subcontractors',
      'Unlimited team members',
      'Unlimited projects',
      'All Professional features',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Volume discounts',
      'White-glove onboarding',
    ],
    subcontractorLimit: null,
    userLimit: null,
    projectLimit: null,
    trialDays: 14,
    stripePriceIdMonthly: 'business_monthly',
    stripePriceIdAnnual: 'business_annual',
    stripeProductId: 'prod_TlmBj7BuzNLQS3',
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
  tier: 'professional' as const, // Trial gets Professional tier features
  subcontractorLimit: 50, // But limited to 50 subcontractors during trial
  features: [
    'Full access to Professional features',
    'Up to 50 subcontractors during trial',
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
 * Get subcontractor limit for a subscription tier
 */
export function getSubcontractorLimit(tier: SubscriptionTier): number | null {
  if (tier === 'trial') {
    return TRIAL_CONFIG.subcontractorLimit
  }
  if (tier === 'subcontractor') {
    return 0 // Subcontractors don't have subcontractors
  }
  const plan = PRICING_PLANS[tier as keyof typeof PRICING_PLANS]
  return plan?.subcontractorLimit ?? null
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
 * Check if subcontractor limit is exceeded
 */
export function isSubcontractorLimitExceeded(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = getSubcontractorLimit(tier)
  if (limit === null) return false // Unlimited
  return currentCount >= limit
}

/**
 * Get subcontractor limit usage info
 */
export function getSubcontractorLimitInfo(tier: SubscriptionTier, currentCount: number): {
  limit: number | null
  current: number
  remaining: number | null
  percentUsed: number
  isAtLimit: boolean
  isNearLimit: boolean // 80% or more used
} {
  const limit = getSubcontractorLimit(tier)

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
  starter: {
    monthly: 'starter_monthly',
    annual: 'starter_annual',
  },
  professional: {
    monthly: 'professional_monthly',
    annual: 'professional_annual',
  },
  business: {
    monthly: 'business_monthly',
    annual: 'business_annual',
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
  subcontractorCount: number,
  userCount: number,
  projectCount: number
): SubscriptionTier | null {
  const tiers: Array<Exclude<SubscriptionTier, 'trial' | 'subcontractor'>> = ['starter', 'professional', 'business']
  const currentIndex = tiers.indexOf(currentTier as typeof tiers[number])

  // Check each tier from current+1 onwards
  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tier = tiers[i]
    const plan = PRICING_PLANS[tier]

    const subcontractorOk = plan.subcontractorLimit === null || subcontractorCount <= plan.subcontractorLimit
    const userOk = plan.userLimit === null || userCount <= plan.userLimit
    const projectOk = plan.projectLimit === null || projectCount <= plan.projectLimit

    if (subcontractorOk && userOk && projectOk) {
      return tier
    }
  }

  return 'business' // Default to business if nothing else fits
}
