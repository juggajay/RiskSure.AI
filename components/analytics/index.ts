// Analytics components and utilities
export { GoogleAnalytics } from './google-analytics'
export { GoogleTagManager, GoogleTagManagerNoScript } from './google-tag-manager'
export { AnalyticsProvider, useAnalytics } from './analytics-provider'

// Re-export tracking functions for convenience
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
} from './analytics-provider'
