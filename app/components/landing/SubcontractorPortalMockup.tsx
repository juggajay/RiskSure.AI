'use client';

import {
  CheckCircle2,
  Clock,
  Upload,
  Shield,
  FileText,
  Calendar,
  Mail,
} from 'lucide-react';

export function SubcontractorPortalMockup() {
  return (
    <div className="bg-white rounded-xl border border-[hsl(40,15%,88%)] overflow-hidden shadow-2xl shadow-[hsl(220,60%,20%)]/10">
      {/* Browser Chrome */}
      <div className="h-8 bg-[hsl(220,20%,97%)] border-b border-[hsl(40,15%,88%)] flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[hsl(0,70%,65%)]" />
          <div className="w-2 h-2 rounded-full bg-[hsl(45,80%,60%)]" />
          <div className="w-2 h-2 rounded-full bg-[hsl(140,60%,50%)]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-2 py-0.5 bg-white rounded text-[9px] text-[hsl(220,10%,50%)] border border-[hsl(40,15%,90%)]">
            portal.risksure.ai/upload/mc7x2k
          </div>
        </div>
      </div>

      {/* Portal Content */}
      <div className="flex flex-col md:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-3 bg-[hsl(40,15%,98%)]">
          {/* Portal Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[hsl(40,15%,90%)]">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-[hsl(220,60%,20%)] flex items-center justify-center">
                <Shield className="h-3 w-3 text-white" />
              </div>
              <div>
                <span className="text-xs font-bold text-[hsl(220,60%,20%)]">RiskSure</span>
                <span className="text-[9px] text-[hsl(220,10%,50%)] ml-1">Subbie Portal</span>
              </div>
            </div>
            <div className="text-[9px] text-[hsl(220,10%,50%)]">Metro Civil Contractors</div>
          </div>

          {/* Welcome + Status Row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-sm font-bold text-[hsl(220,60%,15%)]">Welcome, Metro Civil!</h1>
              <p className="text-[9px] text-[hsl(220,10%,50%)]">Certificates for Hutchinson Builders</p>
            </div>
            <div className="flex gap-2">
              <div className="text-center px-2 py-1 bg-white rounded-lg border border-[hsl(152,60%,80%)]">
                <div className="text-sm font-bold text-[hsl(152,60%,35%)]">3</div>
                <div className="text-[8px] text-[hsl(152,60%,40%)]">Verified</div>
              </div>
              <div className="text-center px-2 py-1 bg-[hsl(35,95%,96%)] rounded-lg border border-[hsl(35,95%,80%)]">
                <div className="text-sm font-bold text-[hsl(35,95%,40%)]">1</div>
                <div className="text-[8px] text-[hsl(35,95%,45%)]">Pending</div>
              </div>
            </div>
          </div>

          {/* Outstanding Request */}
          <div className="mb-3 p-2 rounded-lg bg-[hsl(35,95%,96%)] border border-[hsl(35,95%,80%)]">
            <div className="flex items-center gap-1 text-[9px] font-bold text-[hsl(35,90%,35%)] mb-1.5">
              <Mail className="h-3 w-3" />
              Request from Hutchinson Builders
            </div>
            <div className="flex items-center gap-2 p-2 bg-white rounded border border-[hsl(35,95%,85%)]">
              <div className="w-7 h-7 rounded-md bg-[hsl(35,95%,92%)] flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-[hsl(35,95%,45%)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-[hsl(220,60%,15%)]">Workers Comp Renewal</div>
                <div className="text-[8px] text-[hsl(220,10%,50%)]">Westfield Tower · Due Jan 15</div>
              </div>
              <button className="text-[8px] px-2 py-1 bg-[hsl(35,95%,50%)] text-[hsl(220,60%,10%)] rounded font-medium">
                Upload
              </button>
            </div>
          </div>

          {/* Verified Certificates */}
          <div className="bg-white rounded-lg border border-[hsl(40,15%,90%)] overflow-hidden">
            <div className="px-2 py-1.5 border-b border-[hsl(40,15%,90%)] flex items-center justify-between bg-[hsl(40,15%,99%)]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[hsl(152,60%,45%)]" />
                <span className="text-[10px] font-semibold text-[hsl(220,60%,15%)]">Verified Certificates</span>
              </div>
              <span className="text-[8px] text-[hsl(220,10%,50%)]">Westfield Tower</span>
            </div>

            <div className="divide-y divide-[hsl(40,15%,92%)]">
              {[
                { type: 'Public Liability', coverage: '$20M', expiry: 'Dec 2026', status: 'compliant' },
                { type: 'Professional Indemnity', coverage: '$5M', expiry: 'Nov 2026', status: 'compliant' },
                { type: 'Workers Compensation', coverage: 'Active', expiry: 'Jan 2026', status: 'expiring' },
              ].map((cert, i) => (
                <div key={i} className="px-2 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      cert.status === 'expiring' ? 'bg-[hsl(35,95%,92%)]' : 'bg-[hsl(152,60%,95%)]'
                    }`}>
                      <FileText className={`h-3 w-3 ${
                        cert.status === 'expiring' ? 'text-[hsl(35,95%,45%)]' : 'text-[hsl(152,60%,45%)]'
                      }`} />
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-[hsl(220,60%,15%)]">{cert.type}</div>
                      <div className="text-[8px] text-[hsl(220,10%,50%)]">{cert.coverage} · Exp: {cert.expiry}</div>
                    </div>
                  </div>
                  {cert.status === 'expiring' ? (
                    <span className="text-[8px] px-1.5 py-0.5 bg-[hsl(35,95%,92%)] text-[hsl(35,95%,40%)] rounded font-medium">
                      Expiring
                    </span>
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(152,60%,45%)]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Upload Success */}
        <div className="w-full md:w-56 bg-white border-t md:border-t-0 md:border-l border-[hsl(40,15%,88%)] p-3">
          {/* Just Uploaded */}
          <div className="rounded-lg border-2 border-[hsl(152,60%,70%)] bg-gradient-to-br from-[hsl(152,60%,97%)] to-[hsl(160,50%,95%)] p-3 mb-3">
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-[hsl(152,60%,45%)] flex items-center justify-center mb-1.5">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-[11px] font-bold text-[hsl(152,60%,30%)]">Certificate Verified!</h3>
              <p className="text-[9px] text-[hsl(152,60%,35%)]">
                Verified in 28 seconds
              </p>
            </div>
          </div>

          {/* Verification Details */}
          <div className="bg-[hsl(40,15%,98%)] rounded-md p-2 border border-[hsl(40,15%,90%)] mb-2">
            <div className="text-[9px] font-semibold text-[hsl(220,60%,15%)] mb-1.5">Extracted Data</div>
            <div className="space-y-1 text-[8px]">
              <div className="flex justify-between">
                <span className="text-[hsl(220,10%,50%)]">Insurer</span>
                <span className="font-medium text-[hsl(220,60%,15%)]">QBE Insurance</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(220,10%,50%)]">Coverage</span>
                <span className="font-medium text-[hsl(220,60%,15%)]">$20,000,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(220,10%,50%)]">Expiry</span>
                <span className="font-medium text-[hsl(220,60%,15%)]">Dec 15, 2026</span>
              </div>
            </div>
          </div>

          {/* Checks Passed */}
          <div className="space-y-1 mb-2">
            {[
              'APRA Regulated Insurer',
              'Coverage Meets Requirements',
              'Policy Currently Active',
              'Principal Indemnity',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[8px]">
                <CheckCircle2 className="h-2.5 w-2.5 text-[hsl(152,60%,45%)]" />
                <span className="text-[hsl(220,10%,45%)]">{item}</span>
              </div>
            ))}
          </div>

          {/* Notified */}
          <div className="pt-2 border-t border-[hsl(40,15%,90%)] text-center">
            <p className="text-[8px] text-[hsl(152,60%,40%)] flex items-center justify-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Hutchinson Builders notified
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
