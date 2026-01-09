// Structured Data (JSON-LD) for SEO
// RiskSure AI - Certificate of Currency Compliance Platform

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://risksure.ai'

// Organization/SoftwareApplication Schema (site-wide)
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RiskSure AI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI-powered Certificate of Currency verification platform for Australian construction industry',
  url: baseUrl,
  logo: `${baseUrl}/logo.png`,
  screenshot: `${baseUrl}/screenshot.png`,
  author: {
    '@type': 'Organization',
    name: 'RiskSure AI',
    url: baseUrl,
  },
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'AUD',
    lowPrice: '349',
    highPrice: '1999',
    offerCount: '4',
  },
  featureList: [
    'AI-powered document verification',
    'Certificate of Currency processing',
    'Automated broker communication',
    'Workers Compensation verification',
    'Principal Indemnity detection',
    'Compliance dashboard',
  ],
  areaServed: {
    '@type': 'Country',
    name: 'Australia',
  },
}

// Local Business Schema
export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareCompany',
  name: 'RiskSure AI',
  description:
    "Australia's first AI-powered insurance compliance platform for the construction industry",
  url: baseUrl,
  logo: `${baseUrl}/logo.png`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Sydney',
    addressRegion: 'NSW',
    addressCountry: 'AU',
  },
  areaServed: {
    '@type': 'Country',
    name: 'Australia',
  },
  priceRange: '$349 - $1999/month',
}

// FAQ Schema Generator
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// Product/Pricing Schema Generator
export function generateProductSchema(product: {
  name: string
  description: string
  price: number
  url?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: 'RiskSure AI',
    },
    offers: {
      '@type': 'Offer',
      price: product.price.toString(),
      priceCurrency: 'AUD',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
      url: product.url || `${baseUrl}/pricing`,
    },
  }
}

// Breadcrumb Schema Generator
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// Article/Blog Schema Generator
export function generateArticleSchema(article: {
  title: string
  description: string
  url: string
  image?: string
  datePublished: string
  dateModified?: string
  authorName?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url,
    image: article.image || `${baseUrl}/og-image.png`,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Organization',
      name: article.authorName || 'RiskSure AI',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'RiskSure AI',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
  }
}

// Default FAQs for the main site
export const defaultFAQs = [
  {
    question: 'What is a Certificate of Currency?',
    answer:
      'A Certificate of Currency (COC) is proof that a contractor or subcontractor holds valid insurance coverage. It shows the type of insurance, policy limits, expiry dates, and the parties covered. In Australian construction, head contractors must verify that all subcontractors have valid COCs before they can work on site.',
  },
  {
    question: 'How does RiskSure AI verify insurance certificates?',
    answer:
      'RiskSure AI uses advanced document processing to extract and verify data from insurance certificates in seconds. Our AI reads the full policy wording to detect Principal Indemnity clauses, checks Workers Compensation registrations with state schemes, and automatically identifies coverage gaps or exclusions that manual review would miss.',
  },
  {
    question: 'What is Principal Indemnity and why does it matter?',
    answer:
      'Principal Indemnity is a clause in insurance policies that extends coverage to protect the head contractor (Principal) from claims arising from the subcontractor\'s work. Without this clause, even if a subcontractor has $20M in coverage, the head contractor may not be protected if something goes wrong.',
  },
  {
    question: 'Is RiskSure AI free for subcontractors?',
    answer:
      'Yes, RiskSure AI is completely free for subcontractors. Unlike traditional prequalification platforms that charge subcontractors $400-3000 per year per builder relationship, we believe the builder who requires the compliance should bear the cost. Your subcontractors simply receive an invitation to upload their documents through our secure portal.',
  },
  {
    question: 'What types of insurance does RiskSure AI verify?',
    answer:
      'RiskSure AI verifies all common construction insurance types including Public Liability, Professional Indemnity, Workers Compensation, Contract Works, and Motor Vehicle insurance. We check policy limits, expiry dates, named insured entities, and specific clauses like Principal Indemnity.',
  },
]

// Component to render JSON-LD
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// Combined structured data component for homepage
export function HomepageStructuredData() {
  const faqSchema = generateFAQSchema(defaultFAQs)

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={localBusinessSchema} />
      <JsonLd data={faqSchema} />
    </>
  )
}
