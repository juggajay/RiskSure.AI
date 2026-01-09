import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://risksure.ai'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/app/',
          '/portal/',
          '/api/',
          '/auth/',
          '/broker/',
          '/404',
          '/500',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
