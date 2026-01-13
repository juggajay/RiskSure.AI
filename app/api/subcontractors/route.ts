import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'
import { parsePaginationParams, createPaginatedResponse } from '@/lib/pagination'
import { lookupABN, companyNamesMatch } from '@/lib/abn-lookup'

// GET /api/subcontractors - List all subcontractors for the company
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const convex = getConvex()

    // Get user session
    const sessionData = await convex.query(api.auth.getUserWithSession, { token })
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = sessionData.user
    if (!user.companyId) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, offset } = parsePaginationParams(searchParams)

    // Get paginated subcontractors with project counts
    const result = await convex.query(api.subcontractors.listPaginated, {
      companyId: user.companyId,
      limit,
      cursor: offset > 0 ? String(offset) : undefined,
    })

    const paginatedResponse = createPaginatedResponse(result.subcontractors, result.total, { page, limit, offset })
    return NextResponse.json({
      subcontractors: result.subcontractors,
      total: result.total,
      ...paginatedResponse
    })
  } catch (error) {
    console.error('Get subcontractors error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/subcontractors - Create a new subcontractor
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const convex = getConvex()

    // Get user session
    const sessionData = await convex.query(api.auth.getUserWithSession, { token })
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = sessionData.user
    if (!user.companyId) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 })
    }

    // Only admin, risk_manager, project_manager can create subcontractors
    if (!['admin', 'risk_manager', 'project_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins, risk managers, and project managers can create subcontractors' }, { status: 403 })
    }

    const body = await request.json()
    const { name, abn, tradingName, trade, address, contactName, contactEmail, contactPhone, brokerName, brokerEmail, brokerPhone } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Subcontractor name is required' }, { status: 400 })
    }

    if (!abn?.trim()) {
      return NextResponse.json({ error: 'ABN is required' }, { status: 400 })
    }

    // Validate ABN format (11 digits)
    const cleanedABN = abn.replace(/\s/g, '')
    if (!/^\d{11}$/.test(cleanedABN)) {
      return NextResponse.json({ error: 'ABN must be exactly 11 digits' }, { status: 400 })
    }

    // Validate ABN using Australian checksum algorithm
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    const digits = cleanedABN.split('').map(Number)
    digits[0] = digits[0] - 1
    const sum = digits.reduce((acc: number, digit: number, i: number) => acc + digit * weights[i], 0)
    if (sum % 89 !== 0) {
      return NextResponse.json({ error: 'Invalid ABN checksum - please verify the ABN is correct' }, { status: 400 })
    }

    // Verify company name matches ABN's registered entity
    try {
      const abnLookupUrl = new URL(`/api/external/abn/${cleanedABN}`, request.url)
      const abnResponse = await fetch(abnLookupUrl.toString())
      const abnData = await abnResponse.json()

      if (abnResponse.ok && abnData.entityName) {
        // ABN has a registered entity name - verify it matches the submitted name
        if (!companyNamesMatch(name.trim(), abnData.entityName)) {
          return NextResponse.json({
            error: `Company name does not match ABN records. The registered entity for this ABN is "${abnData.entityName}". Please use the registered business name or verify the ABN is correct.`,
            registeredName: abnData.entityName
          }, { status: 400 })
        }
      }
      // If ABN lookup fails or has no entity name, allow submission (the ABN is still valid by checksum)
    } catch (abnLookupError) {
      // If ABN lookup fails, log but don't block - the ABN is still valid by checksum
      console.warn('ABN lookup failed during subcontractor creation:', abnLookupError)
    }

    // Check if ABN already exists
    const existingSub = await convex.query(api.subcontractors.getByAbn, {
      companyId: user.companyId,
      abn: cleanedABN,
    })

    if (existingSub) {
      return NextResponse.json({ error: 'A subcontractor with this ABN already exists' }, { status: 409 })
    }

    // Create subcontractor
    const subcontractorId = await convex.mutation(api.subcontractors.create, {
      companyId: user.companyId,
      name: name.trim(),
      abn: cleanedABN,
      tradingName: tradingName?.trim() || undefined,
      trade: trade?.trim() || undefined,
      address: address?.trim() || undefined,
      contactName: contactName?.trim() || undefined,
      contactEmail: contactEmail?.toLowerCase().trim() || undefined,
      contactPhone: contactPhone?.trim() || undefined,
      brokerName: brokerName?.trim() || undefined,
      brokerEmail: brokerEmail?.toLowerCase().trim() || undefined,
      brokerPhone: brokerPhone?.trim() || undefined,
    })

    // Log the action
    await convex.mutation(api.auditLogs.create, {
      companyId: user.companyId,
      userId: user._id,
      entityType: 'subcontractor',
      entityId: subcontractorId,
      action: 'create',
      details: { name: name.trim(), abn: cleanedABN },
    })

    // Get the created subcontractor
    const subcontractor = await convex.query(api.subcontractors.getById, { id: subcontractorId })

    return NextResponse.json({
      success: true,
      message: 'Subcontractor created successfully',
      subcontractor
    }, { status: 201 })

  } catch (error) {
    console.error('Create subcontractor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
