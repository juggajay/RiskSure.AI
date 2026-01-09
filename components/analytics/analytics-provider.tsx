'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import {
  initDataLayer,
  setUserProperties,
  trackEvent,
  trackSignUp,
  trackTrialStarted,
  trackDemoRequested,
  trackPurchase,
  trackAddToCart,
  trackFirstVerification,
  trackProjectCreated,
  trackSubcontractorAdded,
  trackDocumentUploaded,
  trackVerificationCompleted,
  trackPricingViewed,
  trackFeaturePageViewed,
  trackContactFormSubmitted,
  trackPortalInviteSent,
} from '@/lib/analytics'

// Analytics context type
interface AnalyticsContextType {
  // User tracking
  setUser: (userId: string, userType: 'visitor' | 'free_trial' | 'customer', companyTier?: 'essential' | 'professional' | 'business' | 'enterprise', userRole?: 'admin' | 'risk_manager' | 'project_manager' | 'readonly') => void
  clearUser: () => void

  // Critical conversion events
  trackSignUp: typeof trackSignUp
  trackTrialStarted: typeof trackTrialStarted
  trackDemoRequested: typeof trackDemoRequested
  trackPurchase: typeof trackPurchase
  trackAddToCart: typeof trackAddToCart

  // High priority events
  trackFirstVerification: typeof trackFirstVerification
  trackProjectCreated: typeof trackProjectCreated
  trackSubcontractorAdded: typeof trackSubcontractorAdded
  trackDocumentUploaded: typeof trackDocumentUploaded
  trackVerificationCompleted: typeof trackVerificationCompleted

  // Medium priority events
  trackPricingViewed: typeof trackPricingViewed
  trackFeaturePageViewed: typeof trackFeaturePageViewed
  trackContactFormSubmitted: typeof trackContactFormSubmitted
  trackPortalInviteSent: typeof trackPortalInviteSent

  // Generic event tracking
  trackEvent: typeof trackEvent
}

// Create context with default values
const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

// Analytics Provider component
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize dataLayer on mount
    initDataLayer()
  }, [])

  const setUser = (
    userId: string,
    userType: 'visitor' | 'free_trial' | 'customer',
    companyTier?: 'essential' | 'professional' | 'business' | 'enterprise',
    userRole?: 'admin' | 'risk_manager' | 'project_manager' | 'readonly'
  ) => {
    setUserProperties({
      user_id: userId,
      user_type: userType,
      company_tier: companyTier,
      user_role: userRole,
    })
  }

  const clearUser = () => {
    setUserProperties({
      user_type: 'visitor',
    })
  }

  const value: AnalyticsContextType = {
    setUser,
    clearUser,
    trackSignUp,
    trackTrialStarted,
    trackDemoRequested,
    trackPurchase,
    trackAddToCart,
    trackFirstVerification,
    trackProjectCreated,
    trackSubcontractorAdded,
    trackDocumentUploaded,
    trackVerificationCompleted,
    trackPricingViewed,
    trackFeaturePageViewed,
    trackContactFormSubmitted,
    trackPortalInviteSent,
    trackEvent,
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

// Custom hook to use analytics
export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

// Export individual tracking functions for direct use
export {
  trackSignUp,
  trackTrialStarted,
  trackDemoRequested,
  trackPurchase,
  trackAddToCart,
  trackFirstVerification,
  trackProjectCreated,
  trackSubcontractorAdded,
  trackDocumentUploaded,
  trackVerificationCompleted,
  trackPricingViewed,
  trackFeaturePageViewed,
  trackContactFormSubmitted,
  trackPortalInviteSent,
  trackEvent,
}
