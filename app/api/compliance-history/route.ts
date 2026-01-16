import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getUserByToken } from '@/lib/auth'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// GET /api/compliance-history - Get compliance trend data (OPTIMIZED)
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)

    // Get date range - default to last 30 days
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)
    const startDateTimestamp = startDate.getTime()

    // OPTIMIZED: Query first to check what we have (fast query, no mutation overhead)
    const historyStart = Date.now()
    const snapshots = await convex.query(api.complianceSnapshots.getHistory, {
      companyId: user.company_id as Id<"companies">,
      startDate: startDateTimestamp,
    })
    console.log(`[PERF] compliance-history getHistory: ${Date.now() - historyStart}ms`)

    // Check if today's snapshot exists in the results
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    const hasTodaySnapshot = snapshots.some(s => s.date === todayStr)

    // OPTIMIZED: Only create today's snapshot if it doesn't exist (skip mutation if not needed)
    if (!hasTodaySnapshot) {
      const snapshotStart = Date.now()
      await convex.mutation(api.complianceSnapshots.createTodaySnapshot, {
        companyId: user.company_id as Id<"companies">,
      })
      console.log(`[PERF] compliance-history createTodaySnapshot: ${Date.now() - snapshotStart}ms`)

      // Add today's data to response (re-fetch just today, not entire history)
      const todaySnapshot = await convex.query(api.complianceSnapshots.getTodaySnapshot, {
        companyId: user.company_id as Id<"companies">,
      })
      if (todaySnapshot) {
        snapshots.unshift({
          date: todayStr,
          total: todaySnapshot.totalSubcontractors,
          compliant: todaySnapshot.compliant,
          nonCompliant: todaySnapshot.nonCompliant,
          pending: todaySnapshot.pending,
          exception: todaySnapshot.exception,
          complianceRate: todaySnapshot.complianceRate,
        })
      }
    }

    // OPTIMIZED: Only generate historical data on first-ever load, not every request
    // Check if we have ANY data - if not, this is first load
    if (snapshots.length === 0) {
      const genStart = Date.now()
      await convex.mutation(api.complianceSnapshots.generateHistoricalSnapshots, {
        companyId: user.company_id as Id<"companies">,
        days,
      })
      console.log(`[PERF] compliance-history generateHistorical: ${Date.now() - genStart}ms`)

      // Fetch the generated data
      const fetchStart = Date.now()
      const generatedSnapshots = await convex.query(api.complianceSnapshots.getHistory, {
        companyId: user.company_id as Id<"companies">,
        startDate: startDateTimestamp,
      })
      console.log(`[PERF] compliance-history getHistory (2nd): ${Date.now() - fetchStart}ms`)
      console.log(`[PERF] compliance-history TOTAL: ${Date.now() - startTime}ms`)

      return NextResponse.json({
        history: generatedSnapshots,
        days,
        generated: true,
      })
    }

    console.log(`[PERF] compliance-history TOTAL: ${Date.now() - startTime}ms`)
    return NextResponse.json({
      history: snapshots,
      days,
      generated: false,
    })
  } catch (error) {
    console.error('Compliance history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
