import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'
import type { Id } from '@/convex/_generated/dataModel'

// Simple in-memory cache for dashboard data
// TTL: 30 seconds - balances freshness with performance
const CACHE_TTL_MS = 30 * 1000
const dashboardCache = new Map<string, { data: any; timestamp: number }>()

function getCachedData(key: string): any | null {
  const cached = dashboardCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }
  // Clean up expired entry
  if (cached) dashboardCache.delete(key)
  return null
}

function setCachedData(key: string, data: any): void {
  dashboardCache.set(key, { data, timestamp: Date.now() })
  // Limit cache size to prevent memory leaks
  if (dashboardCache.size > 100) {
    const oldestKey = dashboardCache.keys().next().value
    if (oldestKey) dashboardCache.delete(oldestKey)
  }
}

// GET /api/dashboard-data - Combined endpoint for all dashboard data (OPTIMIZED)
// Eliminates multiple HTTP cold starts by fetching everything in one request
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const convex = getConvex()

    // Use Convex for session validation (consistent with login route)
    const sessionData = await convex.query(api.auth.getUserWithSession, { token })
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { user, company } = sessionData

    if (!user.companyId) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const historyDays = parseInt(searchParams.get('historyDays') || '30')

    const companyId = user.companyId as Id<"companies">
    const cacheKey = `dashboard:${companyId}:${historyDays}`

    // Check cache first (30 second TTL)
    const cachedResponse = getCachedData(cacheKey)
    if (cachedResponse) {
      console.log(`[PERF] dashboard-data CACHE HIT: ${Date.now() - startTime}ms`)
      return NextResponse.json(cachedResponse)
    }

    // Calculate date range for compliance history
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - historyDays)
    startDate.setHours(0, 0, 0, 0)
    const startDateTimestamp = startDate.getTime()

    // OPTIMIZED: Fetch ALL data in PARALLEL with a single HTTP request
    // Note: company info already available from sessionData, no need to query again
    const parallelStart = Date.now()
    const [morningBrief, complianceSnapshots] = await Promise.all([
      // Morning brief data
      convex.query(api.dashboard.getMorningBrief, { companyId }),
      // Compliance history (query only, no mutation)
      convex.query(api.complianceSnapshots.getHistory, {
        companyId,
        startDate: startDateTimestamp,
      }),
    ])
    console.log(`[PERF] dashboard-data parallel queries: ${Date.now() - parallelStart}ms`)

    // Check if today's snapshot exists
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    const hasTodaySnapshot = complianceSnapshots.some(s => s.date === todayStr)

    // Only create today's snapshot if needed (rare - once per day)
    let finalSnapshots = complianceSnapshots
    if (!hasTodaySnapshot) {
      const snapshotStart = Date.now()
      await convex.mutation(api.complianceSnapshots.createTodaySnapshot, { companyId })
      console.log(`[PERF] dashboard-data createTodaySnapshot: ${Date.now() - snapshotStart}ms`)

      // Fetch today's snapshot to add to results
      const todaySnapshot = await convex.query(api.complianceSnapshots.getTodaySnapshot, { companyId })
      if (todaySnapshot) {
        finalSnapshots = [{
          date: todayStr,
          total: todaySnapshot.totalSubcontractors,
          compliant: todaySnapshot.compliant,
          nonCompliant: todaySnapshot.nonCompliant,
          pending: todaySnapshot.pending,
          exception: todaySnapshot.exception,
          complianceRate: todaySnapshot.complianceRate,
        }, ...complianceSnapshots]
      }
    }

    // Only generate historical data on first-ever load
    if (finalSnapshots.length === 0) {
      await convex.mutation(api.complianceSnapshots.generateHistoricalSnapshots, {
        companyId,
        days: historyDays,
      })
      finalSnapshots = await convex.query(api.complianceSnapshots.getHistory, {
        companyId,
        startDate: startDateTimestamp,
      })
    }

    console.log(`[PERF] dashboard-data TOTAL: ${Date.now() - startTime}ms`)

    // Build response data
    const responseData = {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: company ? {
          id: company._id,
          name: company.name,
          abn: company.abn || '',
        } : null,
      },
      morningBrief,
      complianceHistory: {
        history: finalSnapshots,
        days: historyDays,
        generated: false,
      },
    }

    // Cache the response for 30 seconds
    setCachedData(cacheKey, responseData)

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Dashboard data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
