"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { AlertCircle, AlertTriangle, ArrowRight, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useSession } from "@/lib/auth/session-context"

interface VendorLimitWarningProps {
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

export function VendorLimitWarning({ variant = "banner", className = "" }: VendorLimitWarningProps) {
  const { companyId } = useSession()

  const vendorLimitInfo = useQuery(
    api.companies.getVendorLimitInfo,
    companyId ? { companyId: companyId as any } : "skip"
  )

  // Don't show anything if loading or no limit info
  if (!vendorLimitInfo) return null

  // Don't show if unlimited tier
  if (vendorLimitInfo.limit === null) return null

  // Don't show if not near limit (< 80%)
  if (!vendorLimitInfo.isNearLimit && !vendorLimitInfo.isAtLimit) return null

  const isAtLimit = vendorLimitInfo.isAtLimit
  const isNearLimit = vendorLimitInfo.isNearLimit && !isAtLimit

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
            ? `Vendor limit reached (${vendorLimitInfo.current}/${vendorLimitInfo.limit})`
            : `${vendorLimitInfo.remaining} vendor${vendorLimitInfo.remaining !== 1 ? "s" : ""} remaining`}
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
                  ? "Vendor Limit Reached"
                  : "Approaching Vendor Limit"}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  isAtLimit ? "text-red-600" : "text-amber-600"
                }`}
              >
                {isAtLimit
                  ? `You've reached your limit of ${vendorLimitInfo.limit} vendors. Upgrade your plan to add more vendors.`
                  : `You're using ${vendorLimitInfo.current} of ${vendorLimitInfo.limit} vendors (${vendorLimitInfo.percentUsed}%). Consider upgrading soon.`}
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
                {vendorLimitInfo.current} of {vendorLimitInfo.limit} vendors
              </span>
              <span
                className={isAtLimit ? "text-red-600" : "text-amber-600"}
              >
                {vendorLimitInfo.percentUsed}%
              </span>
            </div>
            <Progress
              value={vendorLimitInfo.percentUsed}
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

/**
 * Hook to check vendor limit before adding a vendor
 * Returns an object with canAdd boolean and optional error message
 */
export function useVendorLimitCheck() {
  const { companyId } = useSession()

  const canAddResult = useQuery(
    api.companies.canAddVendor,
    companyId ? { companyId: companyId as any } : "skip"
  )

  return {
    canAdd: canAddResult?.allowed ?? true,
    reason: canAddResult?.reason ?? null,
    currentCount: canAddResult?.currentCount ?? 0,
    limit: canAddResult?.limit ?? null,
    remaining: canAddResult?.remaining ?? null,
    suggestedUpgrade: canAddResult?.suggestedUpgrade ?? null,
    isLoading: canAddResult === undefined,
  }
}
