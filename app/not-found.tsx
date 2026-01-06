'use client'

import Link from 'next/link'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* 404 Icon/Number */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
            <Search className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-6xl font-bold text-slate-900">404</h1>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">
          Page Not Found
        </h2>
        <p className="text-slate-600 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
        </p>

        {/* Navigation Options */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2" onClick={() => window.history.back()}>
            <Link href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }}>
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Link>
          </Button>
        </div>

        {/* Additional Links */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-3">Or try one of these:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/dashboard/projects" className="text-primary hover:underline">
              Projects
            </Link>
            <Link href="/dashboard/subcontractors" className="text-primary hover:underline">
              Subcontractors
            </Link>
            <Link href="/dashboard/documents" className="text-primary hover:underline">
              Documents
            </Link>
            <Link href="/dashboard/settings" className="text-primary hover:underline">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
