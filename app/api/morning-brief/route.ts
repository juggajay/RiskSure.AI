import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getUserByToken } from '@/lib/auth'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// GET /api/morning-brief - Get dashboard morning brief data
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const authStart = Date.now()
    const user = getUserByToken(token)
    console.log(`[PERF] morning-brief auth: ${Date.now() - authStart}ms`)

    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 404 })
    }

    // Get all morning brief data in a single efficient query
    const queryStart = Date.now()
    const briefData = await convex.query(api.dashboard.getMorningBrief, {
      companyId: user.company_id as Id<"companies">,
    })
    console.log(`[PERF] morning-brief Convex query: ${Date.now() - queryStart}ms`)
    console.log(`[PERF] morning-brief TOTAL: ${Date.now() - startTime}ms`)

    return NextResponse.json(briefData)

  } catch (error) {
    console.error('Morning brief error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
