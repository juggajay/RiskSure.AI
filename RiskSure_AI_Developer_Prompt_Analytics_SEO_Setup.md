# Developer Prompt: Complete Google Analytics, Search Console & SEO Setup for RiskSure AI

## Project Context

**Domain:** risksure.ai
**Product:** RiskSure AI — Autonomous insurance compliance verification platform for Australian construction
**Target Market:** Australian Head Contractors (Tier 1-3), targeting companies managing 50-300+ subcontractors
**Primary Value Prop:** AI-powered Certificate of Currency verification that reads, verifies, and chases — eliminating manual compliance admin

---

## Task Overview

Set up complete Google analytics, search tracking, and SEO infrastructure for risksure.ai. This includes Google Search Console, Google Analytics 4 (GA4), Google Tag Manager (GTM), conversion tracking, and technical SEO implementation.

---

## Part 1: Google Search Console Setup

### 1.1 Property Verification
- Create Google Search Console property for `risksure.ai`
- Add both versions:
  - `https://risksure.ai`
  - `https://www.risksure.ai` (if applicable)
- Verify ownership via DNS TXT record (preferred) or HTML meta tag
- Set preferred domain version

### 1.2 Sitemap Configuration
- Generate dynamic XML sitemap at `/sitemap.xml`
- Include all public pages:
  - Homepage
  - Features/Product pages
  - Pricing page
  - About/Company pages
  - Blog posts (if exists)
  - Legal pages (Privacy, Terms)
- Exclude:
  - Dashboard/authenticated routes
  - API endpoints
  - Subcontractor/Broker portal pages
- Submit sitemap to Search Console
- Set up automatic sitemap regeneration on content changes

### 1.3 Robots.txt
Create `/robots.txt`:
```
User-agent: *
Allow: /

# Block authenticated areas
Disallow: /dashboard/
Disallow: /app/
Disallow: /portal/
Disallow: /api/
Disallow: /auth/

# Block utility pages
Disallow: /404
Disallow: /500

Sitemap: https://risksure.ai/sitemap.xml
```

### 1.4 Search Console Monitoring
- Enable email alerts for:
  - Coverage issues
  - Manual actions
  - Security issues
- Request indexing for key pages after setup

---

## Part 2: Google Analytics 4 (GA4) Setup

### 2.1 Property Creation
- Create GA4 property for risksure.ai
- Data Stream: Web (https://risksure.ai)
- Enable Enhanced Measurement:
  - Page views ✓
  - Scrolls ✓
  - Outbound clicks ✓
  - Site search ✓
  - Form interactions ✓
  - File downloads ✓

### 2.2 Data Settings
- Data retention: 14 months
- Enable Google Signals (for cross-device tracking)
- Enable User ID tracking (for logged-in users)
- Set reporting timezone: Australia/Sydney
- Set currency: AUD

### 2.3 Custom Dimensions (User-Scoped)
| Dimension Name | Scope | Purpose |
|----------------|-------|---------|
| `user_type` | User | visitor / free_trial / customer |
| `company_tier` | User | essential / professional / business / enterprise |
| `user_role` | User | admin / risk_manager / project_manager / readonly |

### 2.4 Custom Dimensions (Event-Scoped)
| Dimension Name | Scope | Purpose |
|----------------|-------|---------|
| `project_id` | Event | Which project action relates to |
| `subcontractor_count` | Event | Number of subs in account |
| `verification_result` | Event | pass / fail / review |

---

## Part 3: Google Tag Manager Setup

### 3.1 Container Setup
- Create GTM container for risksure.ai
- Install GTM snippet in `<head>` (as high as possible)
- Install noscript fallback in `<body>`

### 3.2 Tags to Implement

**GA4 Configuration Tag:**
- Tag Type: Google Analytics: GA4 Configuration
- Measurement ID: G-XXXXXXXXXX
- Trigger: All Pages

**GA4 Event Tags (create for each conversion):**
See Part 4 for specific events

### 3.3 Variables to Create

**Built-in Variables (enable):**
- Page URL, Page Path, Page Hostname
- Click Element, Click Classes, Click ID, Click URL
- Form Element, Form Classes, Form ID
- Scroll Depth Threshold

**User-Defined Variables:**
| Variable Name | Type | Value |
|---------------|------|-------|
| `dlv_user_id` | Data Layer Variable | `user_id` |
| `dlv_user_type` | Data Layer Variable | `user_type` |
| `dlv_company_tier` | Data Layer Variable | `company_tier` |
| `dlv_event_value` | Data Layer Variable | `event_value` |

### 3.4 Data Layer Implementation

Push to dataLayer on user authentication:
```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  'user_id': 'USER_UUID', // Hashed/anonymized
  'user_type': 'customer', // visitor | free_trial | customer
  'company_tier': 'professional', // essential | professional | business | enterprise
  'user_role': 'admin' // admin | risk_manager | project_manager | readonly
});
```

---

## Part 4: Conversion Events Setup

### 4.1 Key Conversion Events

Implement these events via GTM or direct gtag calls:

| Event Name | Trigger | Parameters | Priority |
|------------|---------|------------|----------|
| `sign_up` | User creates account | `method`, `user_type` | 🔴 Critical |
| `trial_started` | Free trial activated | `trial_length` | 🔴 Critical |
| `demo_requested` | Demo form submitted | `company_size`, `source` | 🔴 Critical |
| `purchase` | Subscription started | `currency`, `value`, `tier` | 🔴 Critical |
| `first_verification` | First COC verified | `result`, `time_to_value` | 🟡 High |
| `project_created` | New project added | `project_id` | 🟡 High |
| `subcontractor_added` | Subcontractor onboarded | `count`, `method` | 🟡 High |
| `document_uploaded` | COC uploaded | `source`, `file_type` | 🟡 High |
| `verification_completed` | AI verification done | `result`, `duration` | 🟡 High |
| `pricing_viewed` | Pricing page viewed | `referrer` | 🟢 Medium |
| `feature_page_viewed` | Feature page viewed | `feature_name` | 🟢 Medium |
| `contact_form_submitted` | Contact form sent | `inquiry_type` | 🟢 Medium |
| `portal_invite_sent` | Subbie portal invite | `count` | 🟢 Medium |

### 4.2 E-commerce Tracking (for subscriptions)

Implement GA4 e-commerce events for Stripe integration:

```javascript
// When user selects a plan
gtag('event', 'add_to_cart', {
  currency: 'AUD',
  value: 999,
  items: [{
    item_id: 'professional_monthly',
    item_name: 'Professional Plan',
    price: 999,
    quantity: 1
  }]
});

// When purchase completes (Stripe webhook → frontend callback)
gtag('event', 'purchase', {
  transaction_id: 'sub_xxxxx',
  currency: 'AUD',
  value: 999,
  items: [{
    item_id: 'professional_monthly',
    item_name: 'Professional Plan',
    price: 999,
    quantity: 1
  }]
});
```

### 4.3 Mark Conversions in GA4

In GA4 Admin → Events → Mark as conversion:
- `sign_up` ✓
- `trial_started` ✓
- `demo_requested` ✓
- `purchase` ✓
- `first_verification` ✓

---

## Part 5: Technical SEO Implementation

### 5.1 Meta Tags (per page)

Implement dynamic meta tags for all pages:

```html
<!-- Primary Meta Tags -->
<title>{Page Title} | RiskSure AI</title>
<meta name="title" content="{Page Title} | RiskSure AI">
<meta name="description" content="{Page-specific description, 150-160 chars}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://risksure.ai/{path}">
<meta property="og:title" content="{Page Title} | RiskSure AI">
<meta property="og:description" content="{Page-specific description}">
<meta property="og:image" content="https://risksure.ai/og-image.png">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://risksure.ai/{path}">
<meta property="twitter:title" content="{Page Title} | RiskSure AI">
<meta property="twitter:description" content="{Page-specific description}">
<meta property="twitter:image" content="https://risksure.ai/og-image.png">

<!-- Additional -->
<meta name="robots" content="index, follow">
<meta name="googlebot" content="index, follow">
<link rel="canonical" href="https://risksure.ai/{path}">
<meta name="geo.region" content="AU">
<meta name="geo.placename" content="Australia">
```

### 5.2 Page-Specific SEO Content

**Homepage:**
- Title: `RiskSure AI | Automated Insurance Compliance for Australian Construction`
- Description: `AI-powered Certificate of Currency verification for Australian builders. Automate subcontractor insurance compliance, reduce admin by 80%, and eliminate coverage gaps.`
- H1: `The autonomous compliance platform that reads, verifies, and chases — so you never rubber-stamp another Certificate of Currency`

**Pricing Page:**
- Title: `Pricing | RiskSure AI - Plans from $349/month`
- Description: `Transparent pricing for automated COC verification. Free for subcontractors. Plans for builders managing 25 to unlimited vendors. Start your 14-day free trial.`

**Features Page:**
- Title: `Features | AI-Powered Insurance Verification | RiskSure AI`
- Description: `Deep policy parsing, Principal Indemnity detection, Workers Comp verification, automated broker chasing. Built specifically for Australian construction compliance.`

### 5.3 Structured Data (JSON-LD)

**Organization Schema (site-wide):**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "RiskSure AI",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "AI-powered Certificate of Currency verification platform for Australian construction industry",
  "url": "https://risksure.ai",
  "logo": "https://risksure.ai/logo.png",
  "screenshot": "https://risksure.ai/screenshot.png",
  "author": {
    "@type": "Organization",
    "name": "RiskSure AI",
    "url": "https://risksure.ai"
  },
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "AUD",
    "lowPrice": "349",
    "highPrice": "1999",
    "offerCount": "4"
  },
  "featureList": [
    "AI-powered document verification",
    "Certificate of Currency processing",
    "Automated broker communication",
    "Workers Compensation verification",
    "Principal Indemnity detection",
    "Compliance dashboard"
  ],
  "areaServed": {
    "@type": "Country",
    "name": "Australia"
  }
}
```

**FAQ Schema (for FAQ sections):**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a Certificate of Currency?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Certificate of Currency (COC) is proof that a contractor or subcontractor holds valid insurance coverage..."
      }
    },
    {
      "@type": "Question",
      "name": "How does RiskSure AI verify insurance certificates?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "RiskSure AI uses advanced document processing to extract and verify data from insurance certificates in seconds..."
      }
    }
  ]
}
```

**Pricing Schema (pricing page):**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "RiskSure AI Professional",
  "description": "AI-powered insurance compliance for mid-sized contractors",
  "brand": {
    "@type": "Brand",
    "name": "RiskSure AI"
  },
  "offers": {
    "@type": "Offer",
    "price": "999",
    "priceCurrency": "AUD",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock",
    "url": "https://risksure.ai/pricing"
  }
}
```

### 5.4 Technical Performance

**Core Web Vitals targets:**
| Metric | Target | Priority |
|--------|--------|----------|
| LCP (Largest Contentful Paint) | < 2.5s | High |
| FID (First Input Delay) | < 100ms | High |
| CLS (Cumulative Layout Shift) | < 0.1 | High |
| TTFB (Time to First Byte) | < 600ms | Medium |

**Implementation checklist:**
- [ ] Image optimization (WebP, lazy loading, srcset)
- [ ] Font optimization (preload, font-display: swap)
- [ ] JS bundle splitting (route-based code splitting)
- [ ] Critical CSS inlining
- [ ] Preconnect to external domains (fonts, analytics)
- [ ] Enable gzip/brotli compression
- [ ] Cache headers for static assets

**Add to `<head>`:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://www.googletagmanager.com">
<link rel="dns-prefetch" href="https://www.google-analytics.com">
```

### 5.5 Internal Linking Structure

Ensure proper internal linking:
- Every page reachable within 3 clicks from homepage
- Breadcrumbs on all pages (with BreadcrumbList schema)
- Related content links on blog posts
- Footer links to key pages

---

## Part 6: Additional Tracking Setup

### 6.1 Google Ads Linking (future-ready)
- Link GA4 property to Google Ads account (when created)
- Enable auto-tagging
- Import conversions from GA4 to Google Ads

### 6.2 Search Console + GA4 Integration
- Link Search Console property to GA4
- Enables Search queries report in GA4

### 6.3 Microsoft Clarity (optional but recommended)
- Add Clarity for heatmaps and session recordings
- Free alternative to Hotjar
- Helps identify UX issues on key conversion pages

---

## Part 7: Testing & Validation

### 7.1 Pre-Launch Checklist

**Google Search Console:**
- [ ] Property verified
- [ ] Sitemap submitted and validated
- [ ] No coverage errors
- [ ] robots.txt validated

**Google Analytics:**
- [ ] GA4 property receiving data
- [ ] All conversion events firing correctly
- [ ] User properties populating
- [ ] E-commerce tracking working with test purchase
- [ ] No PII being collected (verify no emails/names in events)

**GTM:**
- [ ] All tags firing on correct triggers
- [ ] No console errors
- [ ] Preview mode tested on all key pages
- [ ] Container published

**SEO:**
- [ ] All pages have unique title/description
- [ ] Canonical URLs correct
- [ ] Structured data validated (Google Rich Results Test)
- [ ] Open Graph tags rendering correctly (use Facebook Debugger)
- [ ] Mobile-friendly test passed
- [ ] Core Web Vitals in green (PageSpeed Insights)

### 7.2 Testing Tools

- **GA4 DebugView:** Real-time event debugging
- **GTM Preview Mode:** Tag firing validation
- **Google Rich Results Test:** Structured data validation
- **PageSpeed Insights:** Core Web Vitals
- **Mobile-Friendly Test:** Responsive design
- **Facebook Sharing Debugger:** OG tag validation
- **Screaming Frog:** Full site crawl (check for issues)

---

## Part 8: Ongoing Monitoring

### 8.1 Weekly Checks
- Search Console: Coverage issues, crawl errors
- GA4: Conversion rates, traffic trends
- Core Web Vitals: Any degradation

### 8.2 Monthly Tasks
- Review top performing pages
- Identify pages with high impressions but low CTR (optimize titles/descriptions)
- Check for 404 errors in Search Console
- Review and action any manual actions

### 8.3 Alerts to Set Up

**GA4 Custom Alerts:**
- Traffic drops > 20% week-over-week
- Conversion rate drops > 30%
- Zero conversions for 24+ hours

**Search Console:**
- Enable email notifications for all issues

---

## Deliverables Summary

1. ✅ Google Search Console property verified and configured
2. ✅ XML sitemap generated and submitted
3. ✅ robots.txt configured
4. ✅ GA4 property with enhanced measurement
5. ✅ GTM container with all tags/triggers
6. ✅ All conversion events tracking
7. ✅ E-commerce tracking for subscriptions
8. ✅ Meta tags on all pages
9. ✅ Structured data implemented
10. ✅ Core Web Vitals optimized
11. ✅ Search Console + GA4 linked
12. ✅ Testing completed and validated

---

## Questions for Developer

Before starting:
1. Do we have a Google Workspace account to use, or should I create properties under a personal account?
2. Who needs access to GA4/Search Console? (Provide email addresses)
3. Any existing tracking code that needs to be removed/migrated?
4. Is there a staging environment that needs separate tracking?

---

## Part 9: Strategic SEO — Keyword Strategy & Content Plan

Based on competitive research of the Australian construction compliance market (January 2026).

### 9.1 Competitive Landscape Summary

| Competitor | Model | SEO Focus | Weakness |
|------------|-------|-----------|----------|
| **Cm3** | Bureau (subbie pays $400-3000/yr) | "contractor prequalification Australia" | Subcontractor resentment, manual WHS focus |
| **TrustLayer/Jones/myCOI/BCS** | US COI platforms | "COI tracking software" (US-focused) | No Australian market presence, no AU-specific content |
| **Procore** | Project management | Broad construction keywords | Insurance is "dumb buckets" — no AI verification |
| **ComplyFlow/LinkSafe** | General contractor management | "contractor management software" | Not COI-specific, broader focus |
| **BuildPass** | Site inductions/SWMS | "construction safety software" | Different value prop |

**Critical Gap Identified:** NO platform ranks for Australian-specific insurance compliance keywords. Zero competitors have content for:
- "Certificate of Currency software Australia"
- "Principal Indemnity verification"
- "Workers Comp verification NSW/VIC/QLD"
- "AI insurance certificate verification"

### 9.2 Target Keywords

**Primary Keywords (Homepage & Core Pages)**
| Keyword | Est. Monthly Volume | Competition | Priority |
|---------|---------------------|-------------|----------|
| certificate of currency software australia | Low-Med | Very Low | 🔴 Critical |
| subcontractor insurance compliance australia | Low-Med | Low | 🔴 Critical |
| COC verification software | Low | Very Low | 🔴 Critical |
| insurance certificate tracking construction | Low-Med | Medium | 🔴 Critical |
| subcontractor compliance software australia | Medium | Low | 🔴 Critical |

**Secondary Keywords (Feature Pages)**
| Keyword | Page Target |
|---------|-------------|
| principal indemnity insurance australia | Features / Blog |
| workers compensation verification nsw | Features / State pages |
| head contractor insurance requirements | Blog / Guide |
| industrial manslaughter compliance software | Features / Blog |
| procore insurance tracking alternative | Comparison page |
| cm3 alternative free for subcontractors | Comparison page |

**Long-Tail Keywords (Blog Content)**
| Keyword | Content Type |
|---------|--------------|
| how to verify subcontractor insurance australia | Guide |
| what is principal indemnity construction | Explainer |
| certificate of currency vs certificate of insurance | FAQ |
| industrial manslaughter laws construction australia | Legal guide |
| deemed employer workers compensation | Risk guide |
| subcontractor insurance requirements nsw/vic/qld | State guides |
| procore insurance certificate limitations | Comparison |
| cm3 cost vs alternatives | Comparison |

### 9.3 Pages to Create for SEO

**Comparison/Alternative Pages (High Intent)**
Create these pages to capture competitor search traffic:

1. `/compare/cm3-alternative` — "RiskSure AI vs Cm3 — Free for Subcontractors"
2. `/compare/procore-insurance` — "Procore Insurance Tracking Limitations & Alternatives"
3. `/compare/trustlayer-australia` — "TrustLayer vs RiskSure AI for Australian Builders"
4. `/compare/coi-tracking-software` — "Best COI Tracking Software for Australian Construction 2026"

**State-Specific Landing Pages**
Create dedicated pages for each major state:

1. `/nsw` — "Subcontractor Insurance Compliance NSW — icare Workers Comp Integration"
2. `/vic` — "Subcontractor Compliance Victoria — WorkSafe Verification"
3. `/qld` — "Certificate of Currency Verification Queensland — WorkCover Integration"
4. `/wa` — "Subcontractor Insurance Management Western Australia"

**Industry/Use Case Pages**
1. `/industries/commercial-construction` — Tier 2-3 commercial builders
2. `/industries/civil-infrastructure` — Civil contractors, road builders
3. `/industries/residential-builders` — Volume home builders

**Resource/Guide Pages**
1. `/guides/certificate-of-currency` — Complete COC guide (anchor content)
2. `/guides/principal-indemnity` — What is Principal Indemnity & why it matters
3. `/guides/industrial-manslaughter-compliance` — Laws by state + how to protect yourself
4. `/guides/workers-compensation-states` — State-by-state WC requirements

### 9.4 Blog Content Strategy

**Pillar Content (Long-Form, 2000+ words)**
| Title | Target Keyword | Purpose |
|-------|----------------|---------|
| Complete Guide to Certificate of Currency for Australian Builders | certificate of currency australia | Anchor content |
| Industrial Manslaughter Laws: What Every Head Contractor Must Know | industrial manslaughter construction | Regulatory awareness |
| Principal Indemnity Explained: The Clause That Could Save Your Business | principal indemnity insurance | Education |
| The True Cost of Non-Compliant Subcontractors | subcontractor insurance risk | Pain point |

**Cluster Content (800-1500 words)**
| Title | Target Keyword |
|-------|----------------|
| What is a Certificate of Currency? (And Why It's Not Enough) | what is certificate of currency |
| Certificate of Currency vs Policy Schedule: What's the Difference? | coc vs policy schedule |
| How Long Does It Take to Verify a Certificate of Currency? | verify certificate of currency |
| 5 Insurance Clauses Builders Miss Every Time | insurance clauses construction |
| Workers Compensation Verification by State: NSW, VIC, QLD | workers comp verification australia |
| Why "Additional Insured" Is Not the Same as "Principal Indemnity" | additional insured vs principal indemnity |
| Procore Insurance Tracking: Features, Limitations & Alternatives | procore insurance certificate |
| Cm3 Fees Explained: What Subcontractors Really Pay | cm3 cost subcontractor |
| How to Check if a Subcontractor's Insurance is Actually Valid | check subcontractor insurance |
| What Happens When a Subcontractor's Insurance Expires On-Site? | expired insurance subcontractor |

**News/Trend Content**
| Title | Trigger |
|-------|---------|
| Industrial Manslaughter Conviction: Lessons for Builders | After any publicized case |
| New NSW Industrial Manslaughter Laws: What Changed | Regulatory updates |
| [Year] Subcontractor Compliance Trends in Australian Construction | Annual review |

### 9.5 Competitor Gap Exploitation

**Cm3 Pain Points to Target:**
- High subcontractor fees ($400-3000/year per builder relationship)
- "Cm3 cost" and "Cm3 pricing" searches indicate price sensitivity
- Position: "Free for Subcontractors" — Cm3 taxes your supply chain, RiskSure doesn't

**Content Angle:**
> "Your subcontractors are paying Cm3 over $100,000 a year across your projects. That cost is hidden in their tender prices. With RiskSure AI, you pay $18,000/year and your subs pay nothing."

**Procore Limitations to Target:**
- Insurance tracking is manual data entry
- No AI verification of policy wording
- No automatic compliance status
- "Underwhelming reporting capabilities" (actual user quote from research)

**Content Angle:**
> "Procore stores your insurance certificates. RiskSure AI reads them, verifies Principal Indemnity clauses, checks Workers Comp registrations, and auto-chases your brokers. The difference? 60 hours of admin saved per month."

**TrustLayer/US Platform Gaps:**
- No Australian insurance format support
- No state-specific Workers Comp API integration
- No understanding of Principal Indemnity (AU) vs Additional Insured (US)

**Content Angle:**
> "US COI tracking software doesn't understand Australian insurance. No Principal Indemnity parsing. No icare or WorkSafe integration. RiskSure AI is built from the ground up for Australian compliance."

### 9.6 Local SEO Setup

**Google Business Profile**
1. Create Google Business Profile for RiskSure AI
2. Business category: "Software Company" or "Business Management Consultant"
3. Service area: Australia (national)
4. Add to profile:
   - Logo and cover image
   - Business description with keywords
   - Website link
   - Operating hours
   - Photos of product/team

**Profile Description (draft):**
> "RiskSure AI is Australia's first AI-powered insurance compliance platform for the construction industry. We help head contractors verify Certificates of Currency in seconds, detect Principal Indemnity gaps, and automate broker chasing. Built specifically for Australian builders managing subcontractor insurance compliance."

**NAP Consistency**
- Ensure Name, Address, Phone are identical across:
  - Website footer
  - Google Business Profile
  - LinkedIn Company Page
  - Any directories (if applicable)

### 9.7 Backlink Strategy

**Target Link Sources (by priority):**

1. **Industry Associations (High Authority)**
   - Master Builders Association (QLD, NSW, VIC, WA)
   - Housing Industry Association (HIA)
   - Civil Contractors Federation
   - Approach: Partner discounts, sponsored content, member resources

2. **Construction Tech Publications**
   - Sourceable.net (Australian construction news)
   - The Fifth Estate
   - Architecture & Design
   - Approach: Press releases, expert commentary, guest posts

3. **Business/Tech Media**
   - SmartCompany
   - Startup Daily
   - Dynamic Business
   - Approach: Founder interviews, funding announcements, trend commentary

4. **Comparison/Review Sites**
   - Capterra (claim and optimize listing)
   - GetApp Australia
   - G2 (if applicable)
   - SoftwareAdvice
   - Approach: Claim profiles, encourage customer reviews

5. **Insurance Industry**
   - Insurance Business Australia
   - Insurance News
   - Approach: Commentary on compliance trends, co-marketing with brokers

**Link-Worthy Content to Create:**
- Annual "State of Construction Compliance" report (original research)
- "Industrial Manslaughter Risk Calculator" (interactive tool)
- "Certificate of Currency Template Generator" (free tool)
- State-by-state compliance requirement guides (comprehensive resources)

### 9.8 Technical SEO Checklist (Extended)

**URL Structure**
```
✅ risksure.ai/features
✅ risksure.ai/pricing
✅ risksure.ai/guides/certificate-of-currency
✅ risksure.ai/compare/cm3-alternative
✅ risksure.ai/nsw

❌ risksure.ai/page?id=123
❌ risksure.ai/features/ai/verification/engine
```

**Heading Hierarchy (per page)**
- One H1 per page (contains primary keyword)
- H2s for major sections
- H3s for subsections
- No skipped levels

**Internal Linking Rules**
- Every blog post links to at least 2 other posts
- Every blog post links to relevant product page
- Feature pages link to related guides
- Comparison pages link to pricing

**Image SEO**
- Descriptive filenames: `certificate-of-currency-verification-dashboard.png`
- Alt text with keywords: "RiskSure AI dashboard showing Certificate of Currency verification status for subcontractors"
- Compress all images (WebP preferred)
- Lazy load below-fold images

### 9.9 Content Calendar (First 3 Months)

**Month 1: Foundation**
- Week 1: Complete Guide to Certificate of Currency (pillar)
- Week 2: What is Principal Indemnity? (explainer)
- Week 3: Cm3 Alternative comparison page
- Week 4: NSW landing page

**Month 2: Expansion**
- Week 1: Industrial Manslaughter Laws guide (pillar)
- Week 2: Workers Comp Verification by State (guide)
- Week 3: Procore Insurance Tracking comparison page
- Week 4: VIC and QLD landing pages

**Month 3: Authority**
- Week 1: 5 Insurance Clauses Builders Miss (blog)
- Week 2: COI Tracking Software comparison (roundup)
- Week 3: Case study from pilot customer
- Week 4: True Cost of Non-Compliant Subcontractors (blog)

### 9.10 SEO KPIs to Track

**Monthly Metrics**
| Metric | Tool | Target (6 months) |
|--------|------|-------------------|
| Organic sessions | GA4 | 500+/month |
| Keyword rankings (primary) | Search Console / Ahrefs | Top 10 for 5+ keywords |
| Indexed pages | Search Console | 20+ |
| Backlinks | Ahrefs / Moz | 25+ |
| Domain authority | Moz | 15+ |

**Quarterly Review**
- Top performing pages by traffic
- Conversion rate from organic traffic
- Content gaps from Search Console queries
- Competitor ranking changes

---

## Part 10: Quick Wins Checklist

**Immediate Actions (Week 1)**
- [ ] Claim Google Business Profile
- [ ] Submit sitemap to Search Console
- [ ] Implement all meta tags on existing pages
- [ ] Add structured data (Organization, SoftwareApplication)
- [ ] Set up GA4 with conversion tracking

**Short-Term (Month 1)**
- [ ] Publish Certificate of Currency guide
- [ ] Create Cm3 comparison page
- [ ] Create NSW landing page
- [ ] Claim Capterra/GetApp profiles
- [ ] Set up Microsoft Clarity

**Medium-Term (Months 2-3)**
- [ ] Publish Industrial Manslaughter guide
- [ ] Create Procore comparison page
- [ ] Create VIC, QLD landing pages
- [ ] Begin outreach to industry associations
- [ ] First case study published

---

*Prompt created for RiskSure AI (risksure.ai) development team*
*SEO Strategy based on competitive research conducted January 2026*
