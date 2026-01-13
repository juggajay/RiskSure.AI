'use client';

import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCheck,
  FolderKanban,
  RefreshCw,
  ChevronRight,
  Send,
  Building2,
  ShieldAlert,
  Mail,
  XCircle,
  TrendingUp,
  Users
} from 'lucide-react';
import { AnimatedGauge } from './ScrollAnimations';

export function MorningBriefMockup() {
  return (
    <div className="bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(40,15%,88%)] overflow-hidden shadow-2xl shadow-[hsl(220,60%,20%)]/10">
      {/* Browser Chrome */}
      <div className="h-10 bg-[hsl(220,20%,97%)] border-b border-[hsl(40,15%,88%)] flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(0,70%,65%)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(45,80%,60%)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(140,60%,50%)]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-0.5 bg-white rounded text-[10px] text-[hsl(220,10%,50%)] border border-[hsl(40,15%,90%)]">
            app.risksure.ai/dashboard
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-48 bg-[hsl(220,40%,12%)] p-3 hidden md:block">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-[hsl(35,95%,55%)] flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-[hsl(220,60%,10%)]" />
            </div>
            <span className="text-white text-sm font-bold">RiskSure</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 px-2.5 py-2 bg-white/10 text-white rounded-lg text-xs font-medium">
              <FolderKanban className="h-3.5 w-3.5" />
              Morning Brief
            </div>
            <div className="flex items-center gap-2.5 px-2.5 py-2 text-white/50 hover:text-white/70 rounded-lg text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Projects
              <span className="ml-auto bg-white/10 px-1.5 py-0.5 rounded text-[10px]">12</span>
            </div>
            <div className="flex items-center gap-2.5 px-2.5 py-2 text-white/50 hover:text-white/70 rounded-lg text-xs">
              <Users className="h-3.5 w-3.5" />
              Subcontractors
              <span className="ml-auto bg-white/10 px-1.5 py-0.5 rounded text-[10px]">847</span>
            </div>
            <div className="flex items-center gap-2.5 px-2.5 py-2 text-white/50 hover:text-white/70 rounded-lg text-xs">
              <FileCheck className="h-3.5 w-3.5" />
              Documents
            </div>
            <div className="flex items-center gap-2.5 px-2.5 py-2 text-white/50 hover:text-white/70 rounded-lg text-xs">
              <Mail className="h-3.5 w-3.5" />
              Communications
            </div>
          </div>

          {/* Sidebar Alert */}
          <div className="mt-6 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 mb-1">
              <AlertTriangle className="h-3 w-3" />
              STOP WORK RISK
            </div>
            <p className="text-[9px] text-red-300/70 leading-relaxed">
              3 subs on-site today with compliance issues
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-5 max-h-[480px] overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-lg font-bold text-[hsl(220,60%,15%)]">Good morning, Sarah!</h1>
              <p className="text-xs text-[hsl(220,10%,50%)]">Here's your compliance overview for today</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-[hsl(152,60%,40%)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152,60%,45%)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(152,60%,45%)]"></span>
                </span>
                Updated 2 min ago
              </div>
              <button className="p-1.5 rounded-lg hover:bg-[hsl(220,20%,95%)] text-[hsl(220,10%,50%)]">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {/* Compliance Rate */}
            <div className="bg-white rounded-xl p-3 border border-[hsl(40,15%,90%)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-[hsl(220,10%,50%)]">Compliance Rate</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Animated SVG Gauge */}
                <div className="relative w-12 h-12">
                  <AnimatedGauge percentage={85} size={48} strokeWidth={4} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[hsl(220,60%,15%)]">85%</span>
                  </div>
                </div>
                <div className="text-[9px] text-[hsl(220,10%,50%)] space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(152,60%,45%)]"></span>
                    720 Compliant
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(35,95%,55%)]"></span>
                    89 Pending
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(0,72%,51%)]"></span>
                    38 Issues
                  </div>
                </div>
              </div>
            </div>

            {/* Active Projects */}
            <div className="bg-white rounded-xl p-3 border border-[hsl(40,15%,90%)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-[hsl(220,10%,50%)]">Active Projects</span>
                <FolderKanban className="h-4 w-4 text-[hsl(220,60%,50%)]" />
              </div>
              <div className="text-2xl font-bold text-[hsl(220,60%,15%)]">12</div>
              <div className="flex items-center gap-1 text-[9px] text-[hsl(152,60%,40%)]">
                <TrendingUp className="h-2.5 w-2.5" />
                2 new this month
              </div>
            </div>

            {/* Pending Reviews */}
            <div className="bg-white rounded-xl p-3 border border-[hsl(35,95%,85%)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-[hsl(220,10%,50%)]">Pending Reviews</span>
                <Clock className="h-4 w-4 text-[hsl(35,95%,45%)]" />
              </div>
              <div className="text-2xl font-bold text-[hsl(35,95%,40%)]">7</div>
              <div className="text-[9px] text-[hsl(35,95%,40%)]">
                COCs need review
              </div>
            </div>

            {/* Stop Work Risks */}
            <div className="bg-[hsl(0,72%,97%)] rounded-xl p-3 border border-[hsl(0,70%,85%)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-[hsl(220,10%,50%)]">Stop Work Risks</span>
                <AlertTriangle className="h-4 w-4 text-[hsl(0,72%,51%)]" />
              </div>
              <div className="text-2xl font-bold text-[hsl(0,72%,45%)]">3</div>
              <div className="text-[9px] text-[hsl(0,72%,45%)]">
                On-site today
              </div>
            </div>
          </div>

          {/* Two Column Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Stop Work Risks Card */}
            <div className="bg-white rounded-xl border border-[hsl(0,70%,90%)] overflow-hidden">
              <div className="px-3 py-2 bg-[hsl(0,72%,97%)] border-b border-[hsl(0,70%,90%)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-[hsl(0,72%,51%)]" />
                  <span className="text-xs font-semibold text-[hsl(0,72%,40%)]">Stop Work Risks</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 bg-[hsl(0,72%,51%)] text-white rounded font-medium">3 Critical</span>
              </div>
              <div className="divide-y divide-[hsl(40,15%,92%)]">
                {[
                  { name: 'Metro Electrical Pty Ltd', project: 'Westfield Tower', issue: 'Expired WorkCover', days: 5 },
                  { name: 'J & K Plumbing Services', project: 'Harbor View Apts', issue: 'Missing Principal Indemnity', days: 0 },
                  { name: 'SafeRoof Contractors', project: 'Crown St Reno', issue: 'Policy Not Active', days: 2 },
                ].map((item, i) => (
                  <div key={i} className="px-3 py-2 hover:bg-[hsl(40,15%,98%)]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[hsl(220,60%,15%)] truncate">{item.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-[hsl(0,72%,95%)] text-[hsl(0,72%,45%)] rounded font-medium">
                            {item.issue}
                          </span>
                        </div>
                        <div className="text-[10px] text-[hsl(220,10%,50%)]">{item.project}</div>
                      </div>
                      <button className="text-[9px] text-[hsl(220,60%,50%)] hover:text-[hsl(220,60%,40%)] font-medium flex items-center gap-0.5">
                        View <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New COCs Card */}
            <div className="bg-white rounded-xl border border-[hsl(40,15%,90%)] overflow-hidden">
              <div className="px-3 py-2 border-b border-[hsl(40,15%,90%)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-3.5 w-3.5 text-[hsl(220,60%,50%)]" />
                  <span className="text-xs font-semibold text-[hsl(220,60%,15%)]">New COCs (24h)</span>
                </div>
                <div className="flex items-center gap-2 text-[9px]">
                  <span className="flex items-center gap-1 text-[hsl(152,60%,40%)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(152,60%,45%)]"></span>
                    4 Passed
                  </span>
                  <span className="flex items-center gap-1 text-[hsl(35,95%,45%)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(35,95%,55%)]"></span>
                    2 Review
                  </span>
                </div>
              </div>
              <div className="divide-y divide-[hsl(40,15%,92%)]">
                {[
                  { file: 'COC_MetroCivil_2026.pdf', sub: 'Metro Civil Contractors', status: 'passed' },
                  { file: 'PublicLiability_Smith.pdf', sub: 'Smith Engineering', status: 'review' },
                  { file: 'WorkCover_ABC_Jan.pdf', sub: 'ABC Formwork', status: 'passed' },
                  { file: 'COC_SafeElec_2026.pdf', sub: 'Safe Electrical Co', status: 'failed' },
                ].map((item, i) => (
                  <div key={i} className="px-3 py-2 hover:bg-[hsl(40,15%,98%)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileCheck className={`h-3.5 w-3.5 flex-shrink-0 ${
                          item.status === 'passed' ? 'text-[hsl(152,60%,45%)]' :
                          item.status === 'review' ? 'text-[hsl(35,95%,50%)]' :
                          'text-[hsl(0,72%,51%)]'
                        }`} />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[hsl(220,60%,15%)] truncate">{item.file}</div>
                          <div className="text-[10px] text-[hsl(220,10%,50%)] truncate">{item.sub}</div>
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        item.status === 'passed' ? 'bg-[hsl(152,60%,92%)] text-[hsl(152,60%,35%)]' :
                        item.status === 'review' ? 'bg-[hsl(35,95%,92%)] text-[hsl(35,95%,35%)]' :
                        'bg-[hsl(0,72%,95%)] text-[hsl(0,72%,45%)]'
                      }`}>
                        {item.status === 'passed' ? 'Passed' : item.status === 'review' ? 'Review' : 'Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Responses */}
          <div className="mt-4 bg-white rounded-xl border border-[hsl(35,95%,85%)] overflow-hidden">
            <div className="px-3 py-2 bg-[hsl(35,95%,96%)] border-b border-[hsl(35,95%,85%)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[hsl(35,95%,45%)]" />
                <span className="text-xs font-semibold text-[hsl(35,95%,35%)]">Pending Responses</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 bg-[hsl(35,95%,55%)] text-white rounded font-medium">5 Waiting</span>
            </div>
            <div className="flex gap-3 p-3 overflow-x-auto">
              {[
                { name: 'Elite Scaffolding', days: 7, urgent: true },
                { name: 'Pro Paint Services', days: 4, urgent: false },
                { name: 'QuickFix HVAC', days: 2, urgent: false },
              ].map((item, i) => (
                <div key={i} className="flex-shrink-0 w-40 p-2.5 rounded-lg border border-[hsl(40,15%,90%)] bg-[hsl(40,15%,99%)]">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-[10px] font-medium text-[hsl(220,60%,15%)]">{item.name}</span>
                  </div>
                  <div className={`text-[9px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                    item.urgent ? 'bg-[hsl(0,72%,95%)] text-[hsl(0,72%,45%)]' : 'bg-[hsl(35,95%,92%)] text-[hsl(35,95%,40%)]'
                  }`}>
                    <Clock className="h-2.5 w-2.5" />
                    {item.days} days waiting
                  </div>
                  <button className="mt-2 w-full text-[9px] py-1 px-2 rounded bg-[hsl(220,60%,50%)] text-white font-medium flex items-center justify-center gap-1 hover:bg-[hsl(220,60%,45%)]">
                    <Send className="h-2.5 w-2.5" />
                    Resend
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
