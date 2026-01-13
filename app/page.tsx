'use client';

import Link from "next/link"
import {
  Shield,
  ArrowRight,
  FileCheck,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  Building2,
  Zap,
  Eye,
  Bell,
  FileText,
  Scale,
  ChevronRight,
  Play,
  BadgeCheck,
  Upload,
  Smartphone
} from "lucide-react"
import { MorningBriefMockup } from "./components/landing/MorningBriefMockup"
import { SubcontractorPortalMockup } from "./components/landing/SubcontractorPortalMockup"
import { AnimateOnScroll, StaggerChildren, AnimatedCounter, ScrollAnimationInit } from "./components/landing/ScrollAnimations"

export default function Home() {
  return (
    <div className="min-h-screen bg-[hsl(40,20%,98%)] texture-grain">
      {/* Initialize scroll animations */}
      <ScrollAnimationInit />
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[hsl(40,20%,98%)]/80 backdrop-blur-md border-b border-[hsl(40,15%,88%)]">
        <div className="container-default h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(220,60%,20%)] flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-[hsl(220,60%,20%)]">
              RiskSure<span className="text-[hsl(220,10%,45%)]">.AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm font-medium text-[hsl(220,10%,45%)] hover:text-[hsl(220,60%,20%)] transition-colors">
              How It Works
            </Link>
            <Link href="#features" className="text-sm font-medium text-[hsl(220,10%,45%)] hover:text-[hsl(220,60%,20%)] transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[hsl(220,10%,45%)] hover:text-[hsl(220,60%,20%)] transition-colors">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost hidden sm:flex">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Try Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* SECTION A: THE HOOK - Morning Brief Dashboard */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-blueprint opacity-60" />
        <div className="gradient-orb w-[600px] h-[600px] bg-[hsl(35,95%,55%)] top-10 right-[-200px] opacity-[0.08]" />
        <div className="gradient-orb w-[400px] h-[400px] bg-[hsl(220,60%,50%)] bottom-20 left-[-100px] opacity-[0.05]" style={{ animationDelay: '-10s' }} />

        <div className="container-default relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Pre-headline: Call out the audience */}
            <AnimateOnScroll animation="fade-up">
              <div className="badge-amber mb-6">
                <Building2 className="h-3.5 w-3.5" />
                For Australian Head Contractors
              </div>
            </AnimateOnScroll>

            {/* H1: Dream outcome - value is time savings, not error catching */}
            <AnimateOnScroll animation="fade-up" delay={100}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[hsl(220,60%,15%)] tracking-tight mb-6 text-balance">
                Stop Paying People
                <br />
                <span className="text-[hsl(220,50%,35%)]">To Chase Certificates.</span>
              </h1>
            </AnimateOnScroll>

            {/* Sub-headline: Timeframe + ease */}
            <AnimateOnScroll animation="fade-up" delay={200}>
              <p className="text-lg md:text-xl text-[hsl(220,10%,40%)] mb-8 max-w-2xl mx-auto leading-relaxed">
                AI verifies certificates of currency in 30 seconds. Your subbies upload directly. Your team just reviews the exceptions. No more chasing, no more spreadsheets.
              </p>
            </AnimateOnScroll>

            {/* Primary CTA - lower friction */}
            <AnimateOnScroll animation="fade-up" delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Link href="/signup" className="btn-primary text-lg px-8 py-4">
                  Check Your First Certificate Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="#how-it-works" className="btn-secondary">
                  <Play className="h-4 w-4" />
                  See How It Works
                </Link>
              </div>
            </AnimateOnScroll>

            {/* Friction reducer - stronger */}
            <AnimateOnScroll animation="fade-up" delay={400}>
              <p className="text-sm text-[hsl(220,10%,50%)]">
                14-day free trial · No credit card · Cancel in 2 clicks
              </p>
            </AnimateOnScroll>
          </div>

          {/* Hero Visual: Morning Brief Dashboard */}
          <AnimateOnScroll animation="scale-up" delay={500} className="mt-12 md:mt-16 max-w-6xl mx-auto">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-b from-[hsl(35,95%,55%)]/10 to-transparent rounded-3xl blur-2xl" />

              {/* Label */}
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(220,10%,45%)]">
                  <Eye className="h-4 w-4" />
                  Your Morning Brief Dashboard
                </span>
              </div>

              {/* Dashboard mockup with floating animation */}
              <div className="relative mockup-float shadow-pulse rounded-xl">
                <MorningBriefMockup />
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* SECTION B: Subcontractor Portal Showcase */}
      <section className="py-16 md:py-24 bg-white border-y border-[hsl(40,15%,90%)] relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-blueprint opacity-30" />

        <div className="container-default relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="order-2 lg:order-1">
              {/* Subbie Portal - prominent headline */}
              <AnimateOnScroll animation="fade-right">
                <div className="mb-8">
                  <div className="badge-navy mb-4">
                    <Users className="h-3.5 w-3.5" />
                    Included Free With Every Plan
                  </div>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[hsl(220,60%,15%)] tracking-tight mb-4">
                    Subbie<span className="text-[hsl(35,95%,50%)]"> Portal</span>
                  </h2>
                  <p className="text-xl text-[hsl(220,10%,40%)]">
                    by <span className="font-semibold text-[hsl(220,60%,20%)]">RiskSure.AI</span>
                  </p>
                </div>
              </AnimateOnScroll>
              <AnimateOnScroll animation="fade-right" delay={100}>
                <h3 className="text-2xl md:text-3xl font-bold text-[hsl(220,60%,15%)] mb-6">
                  Your subbies upload.<br />
                  <span className="text-[hsl(220,50%,35%)]">You just review.</span>
                </h3>
              </AnimateOnScroll>
              <AnimateOnScroll animation="fade-right" delay={200}>
                <p className="text-lg text-[hsl(220,10%,40%)] mb-8 leading-relaxed">
                  Every subbie gets their own portal—free forever. They upload certificates directly,
                  AI verifies instantly, and your team just reviews exceptions. No more email chains.
                  No more chasing.
                </p>
              </AnimateOnScroll>

              <StaggerChildren className="space-y-4 mb-8">
                {[
                  { icon: Smartphone, title: "Mobile-friendly upload", desc: "Subbies snap a photo from site and upload in seconds" },
                  { icon: Zap, title: "Instant AI verification", desc: "Results in under 30 seconds—coverage, expiry, insurer check" },
                  { icon: Bell, title: "Automatic follow-ups", desc: "System chases overdue certs so your team doesn't have to" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 stagger-item">
                    <div className="icon-box flex-shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[hsl(220,60%,15%)] mb-1">{item.title}</h4>
                      <p className="text-sm text-[hsl(220,10%,45%)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </StaggerChildren>

              <AnimateOnScroll animation="fade-up" delay={400}>
                <div className="flex items-center gap-6">
                  <Link href="/signup" className="btn-primary">
                    Try Free for 14 Days
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <div className="text-sm text-[hsl(220,10%,50%)]">
                    <span className="font-medium text-[hsl(152,60%,40%)]">Free</span> for all your subbies
                  </div>
                </div>
              </AnimateOnScroll>
            </div>

            {/* Right: Portal Mockup */}
            <AnimateOnScroll animation="fade-left" delay={200} className="order-1 lg:order-2">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-b from-[hsl(220,60%,50%)]/10 to-transparent rounded-3xl blur-2xl" />

                {/* Label */}
                <div className="text-center mb-4">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(220,10%,45%)]">
                    <Users className="h-4 w-4" />
                    Subbie Portal View
                  </span>
                </div>

                <div className="relative mockup-float shadow-pulse">
                  <SubcontractorPortalMockup />
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* SECTION C: THE ARGUMENT (Problem → Solution) */}
      <section className="section-padding bg-[hsl(40,15%,96%)]">
        <div className="container-default">
          {/* The Problem */}
          <AnimateOnScroll animation="fade-up" className="max-w-3xl mx-auto text-center mb-16">
            <span className="badge-navy mb-4">The Problem</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(220,60%,15%)] mb-6">
              Your compliance team shouldn't be data entry clerks
            </h2>
            <p className="text-lg text-[hsl(220,10%,40%)] leading-relaxed">
              You've got 200+ subbies across multiple projects. Each one has 3-4 certificates. That's 800 documents your team is manually chasing, checking, and tracking in spreadsheets. There's a better use of their time.
            </p>
          </AnimateOnScroll>

          {/* Pain points */}
          <StaggerChildren className="grid md:grid-cols-3 gap-6 mb-20">
            <div className="card-feature card-lift group stagger-item">
              <div className="icon-box-destructive mb-5">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[hsl(220,60%,15%)] mb-2">
                Endless Email Chains
              </h3>
              <p className="text-[hsl(220,10%,45%)] text-sm leading-relaxed">
                "Can you resend your COC?" "Is this the latest version?" "Your policy expired last week." Your team spends hours chasing documents that subbies should just upload themselves.
              </p>
            </div>
            <div className="card-feature card-lift group stagger-item">
              <div className="icon-box-destructive mb-5">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[hsl(220,60%,15%)] mb-2">
                Manual Verification
              </h3>
              <p className="text-[hsl(220,10%,45%)] text-sm leading-relaxed">
                Checking expiry dates, coverage limits, ABN matching, insurer validity—for every certificate, every subbie, every project. That's skilled work being spent on data entry.
              </p>
            </div>
            <div className="card-feature card-lift group stagger-item">
              <div className="icon-box-destructive mb-5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[hsl(220,60%,15%)] mb-2">
                Audit Trail Gaps
              </h3>
              <p className="text-[hsl(220,10%,45%)] text-sm leading-relaxed">
                Spreadsheets don't create the paper trail you need for industrial manslaughter legislation. When regulators ask "show me your process", you need more than a .xlsx file.
              </p>
            </div>
          </StaggerChildren>

          {/* The Solution */}
          <AnimateOnScroll animation="scale-up" className="max-w-4xl mx-auto">
            <div className="bg-[hsl(220,60%,15%)] rounded-2xl p-8 md:p-12 text-center relative overflow-hidden card-glow">
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(35,95%,55%)] rounded-full blur-[100px] opacity-20" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 mb-6">
                  <Zap className="h-3.5 w-3.5" />
                  The Solution
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Subbies upload. AI verifies. You just review.
                </h3>
                <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
                  Your subbies get a free portal—they upload their certificates directly. AI does the verification in 30 seconds: expiry dates, coverage limits, APRA check, ABN match. Your team only handles exceptions.
                </p>

                {/* Benefit stack */}
                <StaggerChildren className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
                  {[
                    { icon: Upload, text: "Subbies upload directly—no more chasing emails" },
                    { icon: Zap, text: "AI verifies in 30 seconds—not 3-5 days" },
                    { icon: Bell, text: "Auto-alerts before expiry—no calendar reminders" },
                    { icon: FileCheck, text: "Audit trail built-in—no spreadsheet gaps" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 stagger-item">
                      <div className="w-6 h-6 rounded-md bg-[hsl(35,95%,55%)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon className="h-3.5 w-3.5 text-[hsl(220,60%,10%)]" />
                      </div>
                      <span className="text-white/90 text-sm">{item.text}</span>
                    </div>
                  ))}
                </StaggerChildren>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* SECTION D: HOW IT WORKS */}
      <section id="how-it-works" className="section-padding-lg bg-white relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-blueprint opacity-20" />

        <div className="container-default relative">
          <AnimateOnScroll animation="fade-up" className="text-center mb-16">
            <span className="badge-amber mb-4">How It Works</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(220,60%,15%)] mb-4">
              From chaos to compliance in 3 steps
            </h2>
            <p className="text-lg text-[hsl(220,10%,40%)] max-w-2xl mx-auto">
              Setup takes 5 minutes. Your first compliance scan runs in under a minute.
            </p>
          </AnimateOnScroll>

          <div className="max-w-4xl mx-auto">
            <StaggerChildren className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-transparent via-[hsl(35,95%,55%)] to-transparent" />

              {[
                {
                  step: "1",
                  title: "Import Your Subbies",
                  description: "Upload a CSV or connect to Procore. We send each subbie a magic link to upload their certificates.",
                  icon: Users,
                },
                {
                  step: "2",
                  title: "AI Verifies Everything",
                  description: "Our AI reads each document—checking coverage limits, expiry dates, exclusions, and ABN matching.",
                  icon: FileCheck,
                },
                {
                  step: "3",
                  title: "You Review Exceptions",
                  description: "Get a daily brief of who's compliant, who's expiring, and who needs follow-up. That's it.",
                  icon: BadgeCheck,
                },
              ].map((item, i) => (
                <div key={i} className="relative text-center stagger-item">
                  {/* Step number */}
                  <div className="w-12 h-12 rounded-full bg-[hsl(35,95%,55%)] flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-[hsl(35,95%,55%)]/20 hover:scale-110 transition-transform duration-300">
                    <span className="text-lg font-bold text-[hsl(220,60%,10%)]">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[hsl(220,60%,15%)] mb-3">{item.title}</h3>
                  <p className="text-[hsl(220,10%,45%)] text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </StaggerChildren>
          </div>
        </div>
      </section>

      {/* SECTION E: FEATURES */}
      <section id="features" className="section-padding bg-[hsl(40,15%,96%)] border-y border-[hsl(40,15%,90%)]">
        <div className="container-default">
          <AnimateOnScroll animation="fade-up" className="text-center mb-16">
            <span className="badge-navy mb-4">Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(220,60%,15%)] mb-4">
              Built for Australian compliance requirements
            </h2>
            <p className="text-lg text-[hsl(220,10%,40%)] max-w-2xl mx-auto">
              Every feature designed around the specific risks head contractors face.
            </p>
          </AnimateOnScroll>

          <StaggerChildren className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Eye,
                title: "Coverage Limit Verification",
                description: "Checks that coverage limits on certificates meet your contract requirements. Flags shortfalls automatically.",
                color: "amber",
              },
              {
                icon: Building2,
                title: "WorkCover State Matching",
                description: "Verifies Workers Comp coverage matches the project's state jurisdiction. No more NSW policies on VIC sites.",
                color: "navy",
              },
              {
                icon: Shield,
                title: "ABN & Entity Verification",
                description: "Flags when the insured entity doesn't match the contracting ABN. Catches phoenix companies using different entities.",
                color: "amber",
              },
              {
                icon: Bell,
                title: "Expiry Monitoring",
                description: "Automated alerts 30, 14, and 7 days before any policy expires. Never miss a renewal again.",
                color: "navy",
              },
              {
                icon: FileCheck,
                title: "APRA Insurer Validation",
                description: "Verifies the insurer is APRA-regulated. Flags unrated offshore entities that won't pay claims.",
                color: "amber",
              },
              {
                icon: Users,
                title: "Free Subbie Portal",
                description: "Subbies upload via magic link—no login, no annual fee. They don't pay $400-$3,000/year like Cm3.",
                color: "navy",
              },
            ].map((feature, i) => (
              <div key={i} className="card-feature card-lift stagger-item">
                <div className={feature.color === 'amber' ? 'icon-box' : 'icon-box-navy'}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[hsl(220,60%,15%)] mt-4 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[hsl(220,10%,45%)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </StaggerChildren>

          {/* Procore integration callout */}
          <AnimateOnScroll animation="fade-up" delay={400} className="mt-12">
            <div className="p-6 md:p-8 rounded-2xl bg-white border border-[hsl(40,15%,88%)] flex flex-col md:flex-row items-center justify-between gap-6 card-lift">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[hsl(40,15%,96%)] flex items-center justify-center border border-[hsl(40,15%,88%)]">
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#F47E20"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#F47E20" strokeWidth="2"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[hsl(220,60%,15%)]">Procore Integration</h4>
                  <p className="text-sm text-[hsl(220,10%,45%)]">Sync vendors, projects, and compliance status automatically</p>
                </div>
              </div>
              <Link href="/pricing" className="btn-secondary whitespace-nowrap">
                View Plans
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* SECTION F: TRUST BUILDERS */}
      <section className="section-padding bg-white relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-blueprint opacity-15" />

        <div className="container-default relative">
          <AnimateOnScroll animation="fade-up" className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(220,60%,15%)] mb-4">
              Why head contractors trust RiskSure
            </h2>
          </AnimateOnScroll>

          <StaggerChildren className="grid md:grid-cols-3 gap-8">
            <div className="text-center stagger-item">
              <div className="text-4xl md:text-5xl font-bold text-[hsl(35,95%,45%)] mb-2">
                <AnimatedCounter value={30} suffix="s" />
              </div>
              <div className="text-[hsl(220,10%,45%)]">to verify a certificate (vs 3-5 days manually chasing)</div>
            </div>
            <div className="text-center stagger-item">
              <div className="text-4xl md:text-5xl font-bold text-[hsl(35,95%,45%)] mb-2">
                <AnimatedCounter value={19} suffix="" />
              </div>
              <div className="text-[hsl(220,10%,45%)]">APRA-regulated Australian insurers in our database</div>
            </div>
            <div className="text-center stagger-item">
              <div className="text-4xl md:text-5xl font-bold text-[hsl(35,95%,45%)] mb-2">
                $<AnimatedCounter value={0} suffix="" />
              </div>
              <div className="text-[hsl(220,10%,45%)]">cost for your subbies (vs $400-$3,000/yr on Cm3)</div>
            </div>
          </StaggerChildren>

          {/* Specificity / expertise signals */}
          <AnimateOnScroll animation="fade-up" delay={300} className="mt-16">
            <div className="p-8 rounded-2xl bg-[hsl(40,15%,97%)] border border-[hsl(40,15%,88%)] card-lift">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="md:w-1/3">
                  <span className="badge-success mb-3">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Australian-Built
                  </span>
                  <h3 className="text-xl font-bold text-[hsl(220,60%,15%)] mb-3">
                    Engineered for Australian legislation
                  </h3>
                  <p className="text-[hsl(220,10%,45%)] text-sm">
                    Not a generic compliance tool. RiskSure understands AS 4000 contracts, state WorkCover schemes, and APRA regulations.
                  </p>
                </div>
                <StaggerChildren className="md:w-2/3 grid sm:grid-cols-2 gap-4">
                  {[
                    "Workers Comp state scheme matching",
                    "Principal Indemnity clause detection",
                    "Cross liability verification",
                    "Waiver of subrogation checking",
                    "APRA-regulated insurer validation",
                    "ABN checksum & entity verification",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 stagger-item">
                      <CheckCircle2 className="h-5 w-5 text-[hsl(152,60%,40%)] flex-shrink-0" />
                      <span className="text-sm text-[hsl(220,60%,15%)]">{item}</span>
                    </div>
                  ))}
                </StaggerChildren>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* SECTION G: FAQ */}
      <section className="section-padding bg-[hsl(40,15%,96%)] border-t border-[hsl(40,15%,90%)]">
        <div className="container-narrow">
          <AnimateOnScroll animation="fade-up" className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(220,60%,15%)] mb-4">
              Common questions
            </h2>
          </AnimateOnScroll>

          <StaggerChildren className="space-y-4">
            {[
              {
                q: "How is this different from Cm3?",
                a: "Cm3 charges your subbies $400-$3,000 per year. They hate it—you've heard the complaints. RiskSure is free for subbies. They upload via magic link, no login, no annual fee. You pay one subscription, they benefit at no cost.",
              },
              {
                q: "Will my subbies actually use it?",
                a: "Yes—because it's free and takes 60 seconds. Magic link, snap a photo, upload. No account creation, no subscription fee, no \"pay-to-play\" complaints. We've removed every barrier that makes subbies drag their feet.",
              },
              {
                q: "What if the AI gets it wrong?",
                a: "Your team always has final approval. AI extracts data and flags issues—but complex documents are marked \"Needs Review\", never auto-approved. Your people make the call. We just do the tedious extraction work for them.",
              },
              {
                q: "We have good people doing this already. Why change?",
                a: "Exactly—you're paying skilled people to chase emails and check expiry dates. That's expensive data entry. RiskSure handles the collection and verification so your team can focus on actual risk management, not admin.",
              },
              {
                q: "What if we're already using Procore?",
                a: "We integrate directly—sync your vendors and projects, push compliance status back automatically. Your team keeps using the tools they know. Available on Compliance and Business plans.",
              },
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-xl bg-white border border-[hsl(40,15%,90%)] card-lift stagger-item">
                <h3 className="font-bold text-[hsl(220,60%,15%)] mb-2">{faq.q}</h3>
                <p className="text-[hsl(220,10%,45%)] text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* SECTION H: THE CLOSER */}
      <section className="section-padding-lg bg-[hsl(220,60%,15%)] relative overflow-hidden">
        {/* Decorative elements with floating animation */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[hsl(35,95%,55%)] rounded-full blur-[150px] opacity-15 gradient-orb" style={{ animationDuration: '25s' }} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(200,80%,50%)] rounded-full blur-[120px] opacity-10 gradient-orb" style={{ animationDuration: '30s', animationDelay: '-15s' }} />

        <div className="container-narrow relative text-center">
          {/* Recap transformation */}
          <AnimateOnScroll animation="fade-up">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <span className="px-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm">
                Spreadsheets & email chains
              </span>
              <ArrowRight className="h-5 w-5 text-[hsl(35,95%,55%)] rotate-90 sm:rotate-0" />
              <span className="px-4 py-2 rounded-lg bg-[hsl(35,95%,55%)] text-[hsl(220,60%,10%)] text-sm font-medium">
                Automated compliance dashboard
              </span>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll animation="fade-up" delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Stop paying people to chase certificates.
            </h2>
          </AnimateOnScroll>

          <AnimateOnScroll animation="fade-up" delay={200}>
            <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
              Subbies upload directly. AI verifies in 30 seconds. Your team just reviews exceptions. Try it free for 14 days—your subbies are free forever.
            </p>
          </AnimateOnScroll>

          {/* Final CTA */}
          <AnimateOnScroll animation="scale-up" delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link href="/signup" className="btn-primary text-lg px-8 py-4">
                Try Free for 14 Days
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/pricing" className="text-white/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                View pricing
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </AnimateOnScroll>

          {/* Risk reversal */}
          <AnimateOnScroll animation="fade-up" delay={400}>
            <p className="text-sm text-white/50">
              14-day free trial · No credit card · Cancel in 2 clicks
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[hsl(220,25%,10%)] border-t border-white/5">
        <div className="container-default">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-white/70" />
              </div>
              <span className="font-bold text-white/70">RiskSure AI</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link href="/pricing" className="hover:text-white/70 transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-white/70 transition-colors">Login</Link>
              <Link href="/signup" className="hover:text-white/70 transition-colors">Sign Up</Link>
            </div>

            <div className="text-sm text-white/40">
              © {new Date().getFullYear()} RiskSure AI · Sydney, Australia
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
