"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { AlertCircle, AlertTriangle, ArrowRight, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useUser } from "@/lib/hooks/use-api"

interface SubcontractorLimitWarningProps {
  /**
   * Where to show the warning
   * - "banner" - Full-width banner at top of page
   * - "compact" - Smaller inline warning
   */
  variant?: "banner" | "compact"
  /**
   * Class name for custom styling
   */
  className?: string
}

// Helper to validate Convex ID format (basic check)
function isValidConvexId(id: string | undefined | null): id is string {
  if (!id || typeof id !== 'string') return false
  // Convex IDs are typically 20+ characters, alphanumeric with some special chars
  return id.length >= 10 && /^[a-zA-Z0-9_-]+$/.test(id)
}

export function SubcontractorLimitWarning({ variant = "banner", className = "" }: SubcontractorLimitWarningProps) {
  const { data: user, isLoading: userLoading } = useUser()
  const companyId = user?.company?.id

  // Only pass companyId to query if it looks like a valid Convex ID
  const validCompanyId = isValidConvexId(companyId) ? companyId : null

  const limitInfo = useQuery(
    api.companies.getSubcontractorLimitInfo,
    validCompanyId ? { companyId: validCompanyId as any } : "skip"
  )

  // Don't show anything if loading, no limit info, or user still loading
  if (userLoading || !limitInfo) return null

  // Don't show if unlimited tier
  if (limitInfo.limit === null) return null

  // Don't show if not near limit (< 80%)
  if (!limitInfo.isNearLimit && !limitInfo.isAtLimit) return null

  const isAtLimit = limitInfo.isAtLimit
  const isNearLimit = limitInfo.isNearLimit && !isAtLimit

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-2 text-sm ${
          isAtLimit ? "text-red-600" : "text-amber-600"
        } ${className}`}
      >
        {isAtLimit ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <span>
          {isAtLimit
            ? `Subcontractor limit reached (${limitInfo.current}/${limitInfo.limit})`
            : `${limitInfo.remaining} subcontractor${limitInfo.remaining !== 1 ? "s" : ""} remaining`}
        </span>
        <Link
          href="/dashboard/settings/billing"
          className="underline hover:no-underline"
        >
          Upgrade
        </Link>
      </div>
    )
  }

  // Banner variant
  return (
    <div
      className={`rounded-lg p-4 ${
        isAtLimit
          ? "bg-red-50 border border-red-200"
          : "bg-amber-50 border border-amber-200"
      } ${className}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2 rounded-full ${
            isAtLimit ? "bg-red-100" : "bg-amber-100"
          }`}
        >
          {isAtLimit ? (
            <AlertCircle className={`h-5 w-5 text-red-600`} />
          ) : (
            <Users className={`h-5 w-5 text-amber-600`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                className={`font-medium ${
                  isAtLimit ? "text-red-800" : "text-amber-800"
                }`}
              >
                {isAtLimit
                  ? "Subcontractor Limit Reached"
                  : "Approaching Subcontractor Limit"}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  isAtLimit ? "text-red-600" : "text-amber-600"
                }`}
              >
                {isAtLimit
                  ? `You've reached your limit of ${limitInfo.limit} subcontractors. Upgrade your plan to add more subcontractors.`
                  : `You're using ${limitInfo.current} of ${limitInfo.limit} subcontractors (${limitInfo.percentUsed}%). Consider upgrading soon.`}
              </p>
            </div>

            <Button
              asChild
              variant={isAtLimit ? "default" : "outline"}
              size="sm"
              className={
                isAtLimit
                  ? "bg-red-600 hover:bg-red-700"
                  : "border-amber-300 text-amber-700 hover:bg-amber-100"
              }
            >
              <Link href="/dashboard/settings/billing">
                Upgrade Plan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span
                className={isAtLimit ? "text-red-600" : "text-amber-600"}
              >
                {limitInfo.current} of {limitInfo.limit} subcontractors
              </span>
              <span
                className={isAtLimit ? "text-red-600" : "text-amber-600"}
              >
                {limitInfo.percentUsed}%
              </span>
            </div>
            <Progress
              value={limitInfo.percentUsed}
              className={`h-2 ${
                isAtLimit
                  ? "[&>div]:bg-red-500"
                  : "[&>div]:bg-amber-500"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Alias for backward compatibility
export const VendorLimitWarning = SubcontractorLimitWarning

/**
 * Hook to check subcontractor limit before adding a subcontractor
 * Returns an object with canAdd boolean and optional error message
 */
export function useSubcontractorLimitCheck() {
  const { data: user, isLoading: userLoading } = useUser()
  const companyId = user?.company?.id

  // Only pass companyId to query if it looks like a valid Convex ID
  const validCompanyId = isValidConvexId(companyId) ? companyId : null

  // Only run the query if we have a valid company ID
  const canAddResult = useQuery(
    api.companies.canAddSubcontractor,
    validCompanyId ? { companyId: validCompanyId as any } : "skip"
  )

  // Handle error state - if query returns undefined but user is loaded with company
  // it might indicate an error, so default to allowing operations
  const hasError = !userLoading && validCompanyId && canAddResult === undefined

  return {
    canAdd: hasError ? true : (canAddResult?.allowed ?? true),
    reason: canAddResult?.reason ?? null,
    currentCount: canAddResult?.currentCount ?? 0,
    limit: canAddResult?.limit ?? null,
    remaining: canAddResult?.remaining ?? null,
    suggestedUpgrade: canAddResult?.suggestedUpgrade ?? null,
    isLoading: userLoading || (validCompanyId ? canAddResult === undefined : false),
    hasError,
  }
}

// Alias for backward compatibility
export const useVendorLimitCheck = useSubcontractorLimitCheck
