'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { GA_MEASUREMENT_ID, trackPageView } from '@/lib/analytics'

function GoogleAnalyticsInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
      trackPageView(url)
    }
  }, [pathname, searchParams])

  // Don't render if no measurement ID or in development
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    return null
  }

  return (
    <>
      {/* Google Analytics 4 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('consent', 'default', {
            'analytics_storage': 'granted',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied'
          });

          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure',
            // Custom dimensions
            custom_map: {
              'dimension1': 'user_type',
              'dimension2': 'company_tier',
              'dimension3': 'user_role'
            }
          });
        `}
      </Script>
    </>
  )
}

export function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner />
    </Suspense>
  )
}
