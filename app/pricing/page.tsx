'use client';

import { useState } from 'react';
import { Check, X, Zap, Shield, Building2, ArrowRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';

type BillingCycle = 'monthly' | 'annual';

interface PricingTier {
  name: string;
  tagline: string;
  icon: React.ReactNode;
  monthlyPrice: number | null;
  annualMonthlyPrice: number | null;
  annualTotal: number | null;
  features: {
    vendors: string;
    team: string;
    projects: string;
  };
  highlights: string[];
  cta: string;
  ctaLink: string;
  popular?: boolean;
  isContactSales?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: 'Starter',
    tagline: 'For growing builders',
    icon: <Zap className="h-6 w-6" />,
    monthlyPrice: 399,
    annualMonthlyPrice: 349,
    annualTotal: 4188,
    features: {
      vendors: 'Up to 75 active subcontractors',
      team: '3 team members',
      projects: '5 projects',
    },
    highlights: [
      'AI-powered certificate verification',
      'Expiry monitoring & alerts',
      'Deficiency notifications to subcontractors',
      'Subcontractor self-service portal',
      'Fraud detection (ABN, policy validation)',
      'Email support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=starter',
  },
  {
    name: 'Professional',
    tagline: 'For established builders',
    icon: <Shield className="h-6 w-6" />,
    monthlyPrice: 1199,
    annualMonthlyPrice: 999,
    annualTotal: 11988,
    features: {
      vendors: 'Up to 250 active subcontractors',
      team: 'Unlimited team members',
      projects: 'Unlimited projects',
    },
    highlights: [
      'Everything in Starter, plus:',
      'Procore integration',
      'Automated follow-up sequences',
      'Principal indemnity detection',
      'Cross liability detection',
      'Waiver of subrogation detection',
      'Workers comp state matching',
      'APRA insurer validation',
      'SMS stop-work alerts',
      'Morning brief dashboard',
      'Exception management',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=professional',
    popular: true,
  },
  {
    name: 'Business',
    tagline: 'For large builders',
    icon: <Building2 className="h-6 w-6" />,
    monthlyPrice: null,
    annualMonthlyPrice: null,
    annualTotal: null,
    features: {
      vendors: 'Unlimited subcontractors',
      team: 'Unlimited team members',
      projects: 'Unlimited projects',
    },
    highlights: [
      'Everything in Professional, plus:',
      'Dedicated onboarding',
      'Custom training session',
      'Priority support SLA',
      'Quarterly business reviews',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact?plan=business',
    isContactSales: true,
  },
];

const comparisonFeatures = [
  {
    category: 'Subcontractors & Team',
    features: [
      { name: 'Active subcontractors', starter: '75', professional: '250', business: 'Unlimited' },
      { name: 'Team members', starter: '3', professional: 'Unlimited', business: 'Unlimited' },
      { name: 'Projects', starter: '5', professional: 'Unlimited', business: 'Unlimited' },
    ]
  },
  {
    category: 'AI Verification',
    features: [
      { name: 'Certificate verification', starter: true, professional: true, business: true },
      { name: 'Principal indemnity detection', starter: false, professional: true, business: true },
      { name: 'Cross liability detection', starter: false, professional: true, business: true },
      { name: 'Waiver of subrogation detection', starter: false, professional: true, business: true },
      { name: 'Workers comp state matching', starter: false, professional: true, business: true },
      { name: 'APRA insurer validation', starter: true, professional: true, business: true },
    ]
  },
  {
    category: 'Fraud Detection',
    features: [
      { name: 'ABN checksum validation', starter: true, professional: true, business: true },
      { name: 'Policy number format check', starter: true, professional: true, business: true },
      { name: 'Duplicate document detection', starter: true, professional: true, business: true },
    ]
  },
  {
    category: 'Automation',
    features: [
      { name: 'Expiry monitoring', starter: true, professional: true, business: true },
      { name: 'Automated follow-up sequences', starter: false, professional: true, business: true },
      { name: 'Morning brief email', starter: false, professional: true, business: true },
      { name: 'Stop-work SMS alerts', starter: false, professional: true, business: true },
    ]
  },
  {
    category: 'Portals',
    features: [
      { name: 'Subcontractor portal', starter: true, professional: true, business: true },
      { name: 'Broker portal', starter: true, professional: true, business: true },
    ]
  },
  {
    category: 'Integrations',
    features: [
      { name: 'Procore', starter: false, professional: true, business: true },
    ]
  },
  {
    category: 'Compliance',
    features: [
      { name: 'Exception management', starter: true, professional: true, business: true },
      { name: 'Review queue', starter: true, professional: true, business: true },
      { name: 'Audit trail', starter: true, professional: true, business: true },
    ]
  },
  {
    category: 'Support',
    features: [
      { name: 'Email support', starter: true, professional: true, business: true },
      { name: 'Priority support', starter: false, professional: true, business: true },
      { name: 'Dedicated onboarding', starter: false, professional: false, business: true },
      { name: 'Quarterly reviews', starter: false, professional: false, business: true },
    ]
  },
];

const faqs = [
  {
    question: 'Is it really free for subcontractors?',
    answer: 'Yes. Your subcontractors access the portal, upload certificates, and track their compliance status at no cost. You pay, they benefit.',
  },
  {
    question: 'What happens when a certificate has issues?',
    answer: "RiskSure automatically emails your subcontractor explaining exactly what's wrong in plain English. They contact their broker, get it fixed, and upload the new certificate. You don't have to chase anyone.",
  },
  {
    question: 'How fast is the AI verification?',
    answer: 'Most certificates are verified in under 30 seconds. Complex documents may be flagged for human review.',
  },
  {
    question: 'Can I try before I buy?',
    answer: 'Yes. All plans include a 14-day free trial with full access. No credit card required to start.',
  },
  {
    question: 'What\'s an "active subcontractor"?',
    answer: "A subcontractor is active if they have a certificate uploaded or monitored within your billing period. Dormant subcontractors don't count against your limit.",
  },
  {
    question: 'Do you integrate with Procore?',
    answer: 'Yes. Professional and Business plans include full Procore integration — sync projects, subcontractors, and push compliance status back to Procore.',
  },
  {
    question: 'What if I need more than 250 subcontractors?',
    answer: "Contact us for Business pricing. We'll set up unlimited subcontractors with dedicated onboarding.",
  },
];

function formatPrice(price: number | null): string {
  if (price === null) return 'Custom';
  return `$${price.toLocaleString()}`;
}

function FeatureCheck({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-gray-900 font-medium">{value}</span>;
  }
  return value ? (
    <Check className="h-5 w-5 text-green-600 mx-auto" />
  ) : (
    <span className="text-gray-400 mx-auto">—</span>
  );
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-4xl py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Automate your insurance compliance. Free for your subcontractors.
            </p>

            {/* Free for Subs Banner */}
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              <Check className="h-4 w-4" />
              All plans include unlimited subcontractor portal access — your subs never pay
            </div>

            {/* Billing Toggle */}
            <div className="mt-10 flex items-center justify-center gap-4">
              <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  billingCycle === 'annual' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    billingCycle === 'annual' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm ${billingCycle === 'annual' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                Annual
              </span>
              {billingCycle === 'annual' && (
                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Save ~17%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto max-w-6xl px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-3xl p-8 ring-1 ${
                tier.popular
                  ? 'bg-gray-900 ring-gray-900'
                  : 'bg-white ring-gray-200'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-blue-600 px-4 py-1 text-sm font-semibold text-white">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <div className={`inline-flex rounded-lg p-2 ${tier.popular ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <span className={tier.popular ? 'text-white' : 'text-gray-600'}>{tier.icon}</span>
                </div>
                <h3 className={`mt-4 text-xl font-semibold ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                  {tier.name}
                </h3>
                <p className={`mt-1 text-sm ${tier.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                  {tier.tagline}
                </p>
              </div>

              <div className="mb-6">
                {tier.isContactSales ? (
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`h-8 w-8 ${tier.popular ? 'text-white' : 'text-gray-900'}`} />
                    <span className={`text-3xl font-bold tracking-tight ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                      Contact Us
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline">
                      <span className={`text-4xl font-bold tracking-tight ${tier.popular ? 'text-white' : 'text-gray-900'}`}>
                        {formatPrice(billingCycle === 'annual' ? tier.annualMonthlyPrice : tier.monthlyPrice)}
                      </span>
                      <span className={`ml-1 text-sm ${tier.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                        /month
                      </span>
                    </div>
                    {billingCycle === 'annual' && tier.annualTotal && (
                      <p className={`mt-1 text-sm ${tier.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                        Billed annually (${tier.annualTotal.toLocaleString()}/year)
                      </p>
                    )}
                    {billingCycle === 'monthly' && tier.monthlyPrice && (
                      <p className={`mt-1 text-sm ${tier.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                        Or ${tier.annualMonthlyPrice}/mo billed annually
                      </p>
                    )}
                  </>
                )}
                {tier.isContactSales && (
                  <p className={`mt-2 text-sm ${tier.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                    For teams managing 500+ subcontractors across multiple regions
                  </p>
                )}
              </div>

              {/* Features summary */}
              <div className={`mb-6 p-4 rounded-lg ${tier.popular ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className={`text-sm space-y-1 ${tier.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                  <p>{tier.features.vendors}</p>
                  <p>{tier.features.team}</p>
                  <p>{tier.features.projects}</p>
                </div>
              </div>

              <ul className="mb-8 space-y-3 flex-1">
                {tier.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    {!highlight.includes('Everything in') && (
                      <Check className={`h-5 w-5 flex-shrink-0 ${tier.popular ? 'text-blue-400' : 'text-green-600'}`} />
                    )}
                    <span className={`text-sm ${
                      highlight.includes('Everything in')
                        ? `font-medium ${tier.popular ? 'text-gray-300' : 'text-gray-700'}`
                        : tier.popular ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaLink}
                className={`block w-full rounded-lg py-3 px-4 text-center text-sm font-semibold transition ${
                  tier.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : tier.isContactSales
                    ? 'bg-white text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* 14-day trial note */}
        <p className="mt-8 text-center text-sm text-gray-500">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-gray-50 py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Compare Plans</h2>
            <p className="mt-4 text-lg text-gray-600">Find the right fit for your business</p>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="mt-6 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500"
            >
              {showComparison ? 'Hide comparison' : 'Show full comparison'}
              <ArrowRight className={`ml-1 h-4 w-4 transition-transform ${showComparison ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showComparison && (
            <div className="overflow-x-auto bg-white rounded-xl shadow-sm ring-1 ring-gray-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-4 px-6 text-sm font-semibold text-gray-900"></th>
                    <th className="py-4 px-4 text-sm font-semibold text-gray-900 text-center">
                      <div>Starter</div>
                      <div className="text-xs font-normal text-gray-500">$349/mo</div>
                    </th>
                    <th className="py-4 px-4 text-sm font-semibold text-gray-900 text-center bg-blue-50">
                      <div>Professional</div>
                      <div className="text-xs font-normal text-gray-500">$999/mo</div>
                    </th>
                    <th className="py-4 px-4 text-sm font-semibold text-gray-900 text-center">
                      <div>Business</div>
                      <div className="text-xs font-normal text-gray-500">Custom</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((category) => (
                    <>
                      <tr key={category.category} className="border-b border-gray-100 bg-gray-50">
                        <td colSpan={4} className="py-3 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr key={feature.name} className="border-b border-gray-100">
                          <td className="py-3 px-6 text-sm text-gray-600">{feature.name}</td>
                          <td className="py-3 px-4 text-center">
                            <FeatureCheck value={feature.starter} />
                          </td>
                          <td className="py-3 px-4 text-center bg-blue-50/50">
                            <FeatureCheck value={feature.professional} />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <FeatureCheck value={feature.business} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* FAQs */}
      <div className="py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <dl className="space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-lg bg-gray-50 p-6">
                <dt className="text-lg font-semibold text-gray-900">{faq.question}</dt>
                <dd className="mt-2 text-gray-600">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Ready to stop chasing certificates?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-500 transition"
            >
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/contact?subject=demo"
              className="inline-flex items-center justify-center rounded-lg bg-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/20 transition"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'RiskSure AI',
            description: 'AI-powered Certificate of Currency verification platform for Australian construction',
            brand: {
              '@type': 'Brand',
              name: 'RiskSure AI',
            },
            offers: [
              {
                '@type': 'Offer',
                name: 'Starter',
                price: '349',
                priceCurrency: 'AUD',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '349',
                  priceCurrency: 'AUD',
                  billingDuration: 'P1M',
                },
                availability: 'https://schema.org/InStock',
              },
              {
                '@type': 'Offer',
                name: 'Professional',
                price: '999',
                priceCurrency: 'AUD',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '999',
                  priceCurrency: 'AUD',
                  billingDuration: 'P1M',
                },
                availability: 'https://schema.org/InStock',
              },
            ],
          }),
        }}
      />
    </div>
  );
}
