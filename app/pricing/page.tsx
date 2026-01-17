'use client';

import { useState } from 'react';
import { Check, Zap, Shield, Building2, ArrowRight, ChevronDown, Users } from 'lucide-react';
import Link from 'next/link';
import { LogoNav, LogoFooter } from "@/components/ui/logo";

type BillingCycle = 'monthly' | 'annual';

interface PricingTier {
  name: string;
  tagline: string;
  icon: React.ReactNode;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  features: {
    subcontractors: string;
    subcontractorCount: number;
    team: string;
    projects: string;
  };
  highlights: string[];
  cta: string;
  ctaLink: string;
  popular?: boolean;
  stripeTier: string;
}

const tiers: PricingTier[] = [
  {
    name: 'Velocity',
    tagline: 'For small builders getting started with compliance automation',
    icon: <Zap className="h-5 w-5" />,
    monthlyPrice: 349,
    annualPrice: 3490,
    annualSavings: 698,
    features: {
      subcontractors: 'Up to 75 active subcontractors',
      subcontractorCount: 75,
      team: '3 team members',
      projects: '5 projects',
    },
    highlights: [
      'AI-powered document verification',
      'Expiry monitoring & alerts',
      'Real-time compliance dashboard',
      'Subcontractor self-service portal',
      'Fraud detection (ABN & policy validation)',
      'Exception management',
      'Email support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=velocity',
    stripeTier: 'velocity',
  },
  {
    name: 'Compliance',
    tagline: 'For growing companies scaling their subcontractor network',
    icon: <Shield className="h-5 w-5" />,
    monthlyPrice: 799,
    annualPrice: 7990,
    annualSavings: 1598,
    features: {
      subcontractors: 'Up to 250 active subcontractors',
      subcontractorCount: 250,
      team: 'Unlimited team members',
      projects: 'Unlimited projects',
    },
    highlights: [
      'Everything in Velocity, plus:',
      'Procore integration',
      'Automated follow-up sequences',
      'Principal indemnity detection',
      'Cross liability detection',
      'Waiver of subrogation detection',
      'Workers comp state matching',
      'APRA insurer validation',
      'SMS stop-work alerts',
      'Morning brief dashboard',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=compliance',
    popular: true,
    stripeTier: 'compliance',
  },
  {
    name: 'Business',
    tagline: 'For large builders with extensive subcontractor networks',
    icon: <Building2 className="h-5 w-5" />,
    monthlyPrice: 1499,
    annualPrice: 14990,
    annualSavings: 2998,
    features: {
      subcontractors: 'Up to 500 active subcontractors',
      subcontractorCount: 500,
      team: 'Unlimited team members',
      projects: 'Unlimited projects',
    },
    highlights: [
      'Everything in Compliance, plus:',
      'Dedicated onboarding session',
      'Quarterly business reviews',
      'Priority support SLA',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=business',
    stripeTier: 'business',
  },
];

const comparisonFeatures = [
  {
    category: 'Capacity',
    features: [
      { name: 'Active subcontractors', velocity: '75', compliance: '250', business: '500' },
      { name: 'Team members', velocity: '3', compliance: 'Unlimited', business: 'Unlimited' },
      { name: 'Projects', velocity: '5', compliance: 'Unlimited', business: 'Unlimited' },
    ]
  },
  {
    category: 'AI Verification',
    features: [
      { name: 'Certificate verification', velocity: true, compliance: true, business: true },
      { name: 'Principal indemnity detection', velocity: false, compliance: true, business: true },
      { name: 'Cross liability detection', velocity: false, compliance: true, business: true },
      { name: 'Waiver of subrogation detection', velocity: false, compliance: true, business: true },
      { name: 'Workers comp state matching', velocity: false, compliance: true, business: true },
      { name: 'APRA insurer validation', velocity: true, compliance: true, business: true },
    ]
  },
  {
    category: 'Fraud Detection',
    features: [
      { name: 'ABN checksum validation', velocity: true, compliance: true, business: true },
      { name: 'Policy number format check', velocity: true, compliance: true, business: true },
      { name: 'Duplicate document detection', velocity: true, compliance: true, business: true },
    ]
  },
  {
    category: 'Automation',
    features: [
      { name: 'Expiry monitoring', velocity: true, compliance: true, business: true },
      { name: 'Automated follow-up sequences', velocity: false, compliance: true, business: true },
      { name: 'Morning brief email', velocity: false, compliance: true, business: true },
      { name: 'Stop-work SMS alerts', velocity: false, compliance: true, business: true },
    ]
  },
  {
    category: 'Portals',
    features: [
      { name: 'Subcontractor portal', velocity: true, compliance: true, business: true },
      { name: 'Broker portal', velocity: true, compliance: true, business: true },
    ]
  },
  {
    category: 'Integrations',
    features: [
      { name: 'Procore', velocity: false, compliance: true, business: true },
    ]
  },
  {
    category: 'Support',
    features: [
      { name: 'Email support', velocity: true, compliance: true, business: true },
      { name: 'Priority support', velocity: false, compliance: true, business: true },
      { name: 'Priority support SLA', velocity: false, compliance: false, business: true },
      { name: 'Dedicated onboarding session', velocity: false, compliance: false, business: true },
      { name: 'Quarterly business reviews', velocity: false, compliance: false, business: true },
    ]
  },
];

const faqs = [
  {
    question: 'Is it really free for subcontractors?',
    answer: 'Yes. Your subcontractors access the portal, upload certificates, and track their compliance status at no cost. You pay, they benefit.',
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
    answer: 'Yes. Compliance and Business plans include full Procore integration — sync projects, subcontractors, and push compliance status back to Procore.',
  },
];

function FeatureCheck({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm font-semibold text-[hsl(220,60%,15%)]">{value}</span>;
  }
  return value ? (
    <Check className="h-5 w-5 text-[hsl(152,60%,40%)] mx-auto" />
  ) : (
    <span className="text-[hsl(220,10%,70%)] mx-auto">—</span>
  );
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,100%)]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[hsl(0,0%,100%)]/80 backdrop-blur-md border-b border-[hsl(220,13%,91%)]">
        <div className="container-default h-16 flex items-center justify-between">
          <LogoNav />

          <div className="hidden md:flex items-center gap-8">
            <Link href="/#how-it-works" className="text-sm font-medium text-[hsl(220,10%,45%)] hover:text-[hsl(220,60%,20%)] transition-colors">
              How It Works
            </Link>
            <Link href="/#features" className="text-sm font-medium text-[hsl(220,10%,45%)] hover:text-[hsl(220,60%,20%)] transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[hsl(220,60%,20%)] transition-colors">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost hidden sm:flex">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16">
        <div className="container-default">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-[hsl(220,60%,15%)] tracking-tight mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-[hsl(220,10%,40%)] mb-8">
              Automate your insurance compliance. Free for your subcontractors.
            </p>

            {/* Free for Subs Banner */}
            <div className="badge-success mb-10">
              <Check className="h-3.5 w-3.5" />
              Free for your subcontractors — they never pay
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-[hsl(220,60%,15%)]' : 'text-[hsl(220,10%,50%)]'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(215,50%,48%)] focus:ring-offset-2 ${
                  billingCycle === 'annual' ? 'bg-[hsl(215,50%,48%)]' : 'bg-[hsl(220,10%,80%)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    billingCycle === 'annual' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-[hsl(220,60%,15%)]' : 'text-[hsl(220,10%,50%)]'}`}>
                Annual
              </span>
              {billingCycle === 'annual' && (
                <span className="badge-amber">
                  Save 17%
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 md:pb-28">
        <div className="container-default">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8 max-w-6xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
                  tier.popular
                    ? 'bg-[hsl(220,60%,15%)] ring-2 ring-[hsl(215,50%,48%)] shadow-xl'
                    : 'bg-white ring-1 ring-[hsl(220,13%,91%)] hover:ring-[hsl(220,13%,85%)] hover:shadow-lg'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-amber">
                    Most Popular
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className={`inline-flex rounded-xl p-2.5 ${tier.popular ? 'bg-white/10' : 'bg-[hsl(220,14%,95%)]'}`}>
                    <span className={tier.popular ? 'text-[hsl(215,50%,48%)]' : 'text-[hsl(220,60%,25%)]'}>{tier.icon}</span>
                  </div>
                  <h3 className={`mt-4 text-xl font-bold ${tier.popular ? 'text-white' : 'text-[hsl(220,60%,15%)]'}`}>
                    {tier.name}
                  </h3>
                  <p className={`mt-1 text-sm ${tier.popular ? 'text-white/60' : 'text-[hsl(220,10%,50%)]'}`}>
                    {tier.tagline}
                  </p>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold tracking-tight ${tier.popular ? 'text-white' : 'text-[hsl(220,60%,15%)]'}`}>
                      ${tier.monthlyPrice}
                    </span>
                    <span className={`text-sm ${tier.popular ? 'text-white/60' : 'text-[hsl(220,10%,50%)]'}`}>
                      /month
                    </span>
                  </div>
                  {billingCycle === 'annual' ? (
                    <p className={`mt-1 text-sm ${tier.popular ? 'text-white/50' : 'text-[hsl(220,10%,50%)]'}`}>
                      Billed annually · ${tier.annualPrice.toLocaleString()}/year
                    </p>
                  ) : (
                    <p className={`mt-1 text-sm ${tier.popular ? 'text-white/50' : 'text-[hsl(220,10%,50%)]'}`}>
                      Or save ${tier.annualSavings} with annual billing
                    </p>
                  )}
                </div>

                {/* Key differentiator: Subcontractor limit */}
                <div className={`mb-6 p-4 rounded-xl ${tier.popular ? 'bg-white/10' : 'bg-[hsl(220,14%,96%)]'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Users className={`h-5 w-5 ${tier.popular ? 'text-[hsl(215,50%,48%)]' : 'text-[hsl(215,50%,38%)]'}`} />
                    <span className={`font-semibold ${tier.popular ? 'text-white' : 'text-[hsl(220,60%,15%)]'}`}>
                      {tier.features.subcontractors}
                    </span>
                  </div>
                  <div className={`text-sm space-y-1 ${tier.popular ? 'text-white/60' : 'text-[hsl(220,10%,50%)]'}`}>
                    <p>{tier.features.team}</p>
                    <p>{tier.features.projects}</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="mb-8 space-y-3 flex-1">
                  {tier.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {!highlight.includes('Everything in') && (
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${tier.popular ? 'text-[hsl(215,50%,48%)]' : 'text-[hsl(152,60%,40%)]'}`} />
                      )}
                      <span className={`text-sm ${
                        highlight.includes('Everything in')
                          ? `font-semibold ${tier.popular ? 'text-white/80' : 'text-[hsl(220,60%,25%)]'}`
                          : tier.popular ? 'text-white/80' : 'text-[hsl(220,10%,40%)]'
                      }`}>
                        {highlight}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={tier.ctaLink}
                  className={`w-full py-3.5 px-4 rounded-lg text-center font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    tier.popular
                      ? 'btn-primary'
                      : 'bg-white text-[hsl(220,60%,20%)] ring-1 ring-[hsl(220,60%,20%)]/20 hover:ring-[hsl(220,60%,20%)]/40 hover:bg-[hsl(220,60%,20%)]/5'
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-12 text-center space-y-2">
            <p className="text-sm text-[hsl(220,10%,50%)]">
              All plans include AI document verification, automated expiry monitoring, and email notifications.
            </p>
            <p className="text-sm text-[hsl(220,10%,50%)]">
              14-day free trial · No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="section-padding bg-white border-y border-[hsl(220,13%,90%)]">
        <div className="container-default">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(220,60%,15%)] mb-4">Compare plans</h2>
            <p className="text-[hsl(220,10%,45%)]">Find the right fit for your business</p>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(215,50%,38%)] hover:text-[hsl(35,95%,35%)] transition-colors"
            >
              {showComparison ? 'Hide comparison' : 'Show full comparison'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showComparison ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showComparison && (
            <div className="overflow-x-auto rounded-xl border border-[hsl(220,13%,91%)] bg-white">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-[hsl(220,13%,90%)]">
                    <th className="py-4 px-6 text-sm font-semibold text-[hsl(220,60%,15%)]"></th>
                    <th className="py-4 px-4 text-center">
                      <div className="text-sm font-bold text-[hsl(220,60%,15%)]">Velocity</div>
                      <div className="text-xs text-[hsl(220,10%,50%)]">$349/mo</div>
                    </th>
                    <th className="py-4 px-4 text-center bg-[hsl(215,50%,48%)]/5">
                      <div className="text-sm font-bold text-[hsl(220,60%,15%)]">Compliance</div>
                      <div className="text-xs text-[hsl(220,10%,50%)]">$799/mo</div>
                    </th>
                    <th className="py-4 px-4 text-center">
                      <div className="text-sm font-bold text-[hsl(220,60%,15%)]">Business</div>
                      <div className="text-xs text-[hsl(220,10%,50%)]">$1,499/mo</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((category) => (
                    <>
                      <tr key={category.category} className="border-b border-[hsl(220,13%,92%)] bg-[hsl(220,14%,97%)]">
                        <td colSpan={4} className="py-3 px-6 text-xs font-bold text-[hsl(220,10%,40%)] uppercase tracking-wider">
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr key={feature.name} className="border-b border-[hsl(220,13%,94%)]">
                          <td className="py-3 px-6 text-sm text-[hsl(220,10%,40%)]">{feature.name}</td>
                          <td className="py-3 px-4 text-center">
                            <FeatureCheck value={feature.velocity} />
                          </td>
                          <td className="py-3 px-4 text-center bg-[hsl(215,50%,48%)]/5">
                            <FeatureCheck value={feature.compliance} />
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
      </section>

      {/* FAQs */}
      <section className="section-padding bg-[hsl(220,14%,96%)]">
        <div className="container-narrow">
          <h2 className="text-2xl md:text-3xl font-bold text-[hsl(220,60%,15%)] text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white border border-[hsl(220,13%,90%)]">
                <h3 className="font-bold text-[hsl(220,60%,15%)] mb-2">{faq.question}</h3>
                <p className="text-[hsl(220,10%,45%)] text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-[hsl(220,60%,15%)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[hsl(215,50%,48%)] rounded-full blur-[150px] opacity-15" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(200,80%,50%)] rounded-full blur-[120px] opacity-10" />

        <div className="container-narrow relative text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to stop chasing certificates?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="btn-primary text-lg px-8 py-4"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/contact?subject=demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-base transition-all duration-200 bg-white/10 text-white hover:bg-white/20"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[hsl(220,25%,10%)] border-t border-white/5">
        <div className="container-default">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <LogoFooter />

            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link href="/pricing" className="hover:text-white/70 transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-white/70 transition-colors">Login</Link>
              <Link href="/signup" className="hover:text-white/70 transition-colors">Sign Up</Link>
            </div>

            <div className="text-sm text-white/40">
              © {new Date().getFullYear()} RiskShield AI · Sydney, Australia
            </div>
          </div>
        </div>
      </footer>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'RiskShield AI',
            description: 'AI-powered Certificate of Currency verification platform for Australian construction',
            brand: {
              '@type': 'Brand',
              name: 'RiskShield AI',
            },
            offers: [
              {
                '@type': 'Offer',
                name: 'Velocity',
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
                name: 'Compliance',
                price: '799',
                priceCurrency: 'AUD',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '799',
                  priceCurrency: 'AUD',
                  billingDuration: 'P1M',
                },
                availability: 'https://schema.org/InStock',
              },
              {
                '@type': 'Offer',
                name: 'Business',
                price: '1499',
                priceCurrency: 'AUD',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '1499',
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
