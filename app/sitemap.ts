import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://risksure.ai'

  // Core public pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reset-password`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Future: Add dynamic pages here
  // - Features page
  // - Pricing page
  // - About page
  // - Blog posts
  // - State-specific landing pages (nsw, vic, qld, wa)
  // - Comparison pages (cm3-alternative, procore-insurance, etc.)
  // - Guide pages (certificate-of-currency, principal-indemnity, etc.)

  return staticPages
}
