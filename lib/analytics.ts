// Google Analytics 4 and Google Tag Manager utility functions
// For RiskSure AI - Certificate of Currency Compliance Platform

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

// GA4 Measurement ID - Replace with actual ID from Google Analytics
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX'

// GTM Container ID - Replace with actual ID from Google Tag Manager
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX'

// Type definitions for analytics events
type UserType = 'visitor' | 'free_trial' | 'customer'
type CompanyTier = 'essential' | 'professional' | 'business' | 'enterprise'
type UserRole = 'admin' | 'risk_manager' | 'project_manager' | 'readonly'
type VerificationResult = 'pass' | 'fail' | 'review'

interface UserProperties {
  user_id?: string
  user_type: UserType
  company_tier?: CompanyTier
  user_role?: UserRole
}

// Initialize dataLayer
export function initDataLayer(): void {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
  }
}

// Push to dataLayer for GTM
export function pushToDataLayer(data: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(data)
  }
}

// Set user properties for GA4
export function setUserProperties(properties: UserProperties): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', 'user_properties', properties)
  }

  // Also push to dataLayer for GTM
  pushToDataLayer({
    user_id: properties.user_id,
    user_type: properties.user_type,
    company_tier: properties.company_tier,
    user_role: properties.user_role,
  })
}

// Generic event tracking
export function trackEvent(
  eventName: string,
  parameters?: Record<string, unknown>
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters)
  }
}

// =====================================================
// CRITICAL CONVERSION EVENTS
// =====================================================

// Sign up event
export function trackSignUp(method: string, userType: UserType = 'free_trial'): void {
  trackEvent('sign_up', {
    method,
    user_type: userType,
  })
}

// Trial started event
export function trackTrialStarted(trialLength: number = 14): void {
  trackEvent('trial_started', {
    trial_length: trialLength,
  })
}

// Demo requested event
export function trackDemoRequested(companySize: string, source: string): void {
  trackEvent('demo_requested', {
    company_size: companySize,
    source,
  })
}

// Purchase/Subscription event (e-commerce)
export function trackPurchase(
  transactionId: string,
  value: number,
  tier: CompanyTier,
  itemId: string,
  itemName: string
): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'AUD',
    value,
    items: [
      {
        item_id: itemId,
        item_name: itemName,
        price: value,
        quantity: 1,
      },
    ],
  })
}

// Add to cart (plan selection)
export function trackAddToCart(
  itemId: string,
  itemName: string,
  price: number
): void {
  trackEvent('add_to_cart', {
    currency: 'AUD',
    value: price,
    items: [
      {
        item_id: itemId,
        item_name: itemName,
        price,
        quantity: 1,
      },
    ],
  })
}

// =====================================================
// HIGH PRIORITY EVENTS
// =====================================================

// First verification completed
export function trackFirstVerification(
  result: VerificationResult,
  timeToValueSeconds: number
): void {
  trackEvent('first_verification', {
    result,
    time_to_value: timeToValueSeconds,
  })
}

// Project created
export function trackProjectCreated(projectId: string): void {
  trackEvent('project_created', {
    project_id: projectId,
  })
}

// Subcontractor added
export function trackSubcontractorAdded(count: number, method: string): void {
  trackEvent('subcontractor_added', {
    count,
    method,
  })
}

// Document uploaded
export function trackDocumentUploaded(source: string, fileType: string): void {
  trackEvent('document_uploaded', {
    source,
    file_type: fileType,
  })
}

// Verification completed
export function trackVerificationCompleted(
  result: VerificationResult,
  durationSeconds: number
): void {
  trackEvent('verification_completed', {
    result,
    duration: durationSeconds,
  })
}

// =====================================================
// MEDIUM PRIORITY EVENTS
// =====================================================

// Pricing page viewed
export function trackPricingViewed(referrer: string): void {
  trackEvent('pricing_viewed', {
    referrer,
  })
}

// Feature page viewed
export function trackFeaturePageViewed(featureName: string): void {
  trackEvent('feature_page_viewed', {
    feature_name: featureName,
  })
}

// Contact form submitted
export function trackContactFormSubmitted(inquiryType: string): void {
  trackEvent('contact_form_submitted', {
    inquiry_type: inquiryType,
  })
}

// Portal invite sent
export function trackPortalInviteSent(count: number): void {
  trackEvent('portal_invite_sent', {
    count,
  })
}

// =====================================================
// PAGE VIEW TRACKING
// =====================================================

// Track page view (for SPA navigation)
export function trackPageView(url: string, title?: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title,
    })
  }
}

// =====================================================
// CUSTOM DIMENSIONS
// =====================================================

// Set custom event-scoped dimensions
export function trackEventWithDimensions(
  eventName: string,
  parameters: {
    project_id?: string
    subcontractor_count?: number
    verification_result?: VerificationResult
    [key: string]: unknown
  }
): void {
  trackEvent(eventName, parameters)
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Check if analytics is available
export function isAnalyticsAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

// Get consent status (for GDPR/privacy compliance)
export function getConsentStatus(): boolean {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('analytics_consent') === 'true'
  }
  return false
}

// Set consent status
export function setConsentStatus(consent: boolean): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem('analytics_consent', consent ? 'true' : 'false')

    // Update GA4 consent
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: consent ? 'granted' : 'denied',
      })
    }
  }
}
