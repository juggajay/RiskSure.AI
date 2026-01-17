import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers"
import { GoogleAnalytics } from "@/components/analytics/google-analytics"
import { GoogleTagManager, GoogleTagManagerNoScript } from "@/components/analytics/google-tag-manager"
import { HomepageStructuredData } from "@/components/seo/structured-data"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
})

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://risksure.ai'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "RiskSure AI | Automated Insurance Compliance for Australian Construction",
    template: "%s | RiskSure AI",
  },
  description: "AI-powered Certificate of Currency verification for Australian builders. Automate subcontractor insurance compliance, reduce admin by 80%, and eliminate coverage gaps.",
  keywords: [
    "certificate of currency",
    "COC verification",
    "insurance compliance",
    "subcontractor management",
    "construction compliance",
    "Australian construction",
    "principal indemnity",
    "workers compensation verification",
    "head contractor compliance",
    "insurance certificate tracking",
  ],
  authors: [{ name: "RiskSure AI" }],
  creator: "RiskSure AI",
  publisher: "RiskSure AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/risksure-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/risksure-icon.svg",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: baseUrl,
    siteName: "RiskSure AI",
    title: "RiskSure AI | Automated Insurance Compliance for Australian Construction",
    description: "AI-powered Certificate of Currency verification for Australian builders. Automate subcontractor insurance compliance, reduce admin by 80%, and eliminate coverage gaps.",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "RiskSure AI - Automated Insurance Compliance Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RiskSure AI | Automated Insurance Compliance for Australian Construction",
    description: "AI-powered Certificate of Currency verification for Australian builders. Automate subcontractor insurance compliance, reduce admin by 80%.",
    images: [`${baseUrl}/og-image.png`],
    creator: "@risksureai",
  },
  alternates: {
    canonical: baseUrl,
  },
  other: {
    "geo.region": "AU",
    "geo.placename": "Australia",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        {/* Google Tag Manager */}
        <GoogleTagManager />

        {/* Structured Data */}
        <HomepageStructuredData />
      </head>
      <body className={inter.className}>
        {/* GTM noscript fallback */}
        <GoogleTagManagerNoScript />

        {/* Google Analytics */}
        <GoogleAnalytics />

        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
