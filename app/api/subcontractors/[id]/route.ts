import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'
import type { Id } from '@/convex/_generated/dataModel'

// GET /api/subcontractors/[id] - Get a single subcontractor with COC history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params

    // Get subcontractor with full details
    const result = await convex.query(api.subcontractors.getByIdWithDetails, {
      id: id as Id<"subcontractors">,
    })

    if (!result) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    // Check if subcontractor belongs to user's company
    if (result.subcontractor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    // Get exceptions for this subcontractor
    const exceptions = await convex.query(api.exceptions.getBySubcontractor, {
      subcontractorId: id as Id<"subcontractors">,
    })

    return NextResponse.json({
      subcontractor: {
        id: result.subcontractor._id,
        name: result.subcontractor.name,
        abn: result.subcontractor.abn,
        acn: result.subcontractor.acn,
        tradingName: result.subcontractor.tradingName,
        address: result.subcontractor.address,
        trade: result.subcontractor.trade,
        contactName: result.subcontractor.contactName,
        contactEmail: result.subcontractor.contactEmail,
        contactPhone: result.subcontractor.contactPhone,
        brokerName: result.subcontractor.brokerName,
        brokerEmail: result.subcontractor.brokerEmail,
        brokerPhone: result.subcontractor.brokerPhone,
        workersCompState: result.subcontractor.workersCompState,
        portalAccess: result.subcontractor.portalAccess,
        projectCount: result.subcontractor.projectCount,
        createdAt: result.subcontractor._creationTime,
        updatedAt: result.subcontractor.updatedAt,
      },
      projects: result.projects,
      cocDocuments: result.cocDocuments,
      currentCoc: result.currentCoc,
      communications: result.communications,
      exceptions,
    })

  } catch (error) {
    console.error('Get subcontractor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/subcontractors/[id] - Update a subcontractor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Security: Prevent read_only users from modifying subcontractors
    if (user.role === 'read_only') {
      return NextResponse.json({ error: 'Read-only users cannot modify subcontractors' }, { status: 403 })
    }

    const { id } = await params

    // Check if subcontractor exists and belongs to user's company
    const subcontractor = await convex.query(api.subcontractors.getById, {
      id: id as Id<"subcontractors">,
    })

    if (!subcontractor || subcontractor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      trading_name,
      address,
      trade,
      contact_name,
      contact_email,
      contact_phone,
      broker_name,
      broker_email,
      broker_phone,
      workers_comp_state
    } = body

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (trading_name !== undefined) updates.tradingName = trading_name
    if (address !== undefined) updates.address = address
    if (trade !== undefined) updates.trade = trade
    if (contact_name !== undefined) updates.contactName = contact_name
    if (contact_email !== undefined) updates.contactEmail = contact_email
    if (contact_phone !== undefined) updates.contactPhone = contact_phone
    if (broker_name !== undefined) updates.brokerName = broker_name
    if (broker_email !== undefined) updates.brokerEmail = broker_email
    if (broker_phone !== undefined) updates.brokerPhone = broker_phone
    if (workers_comp_state !== undefined) updates.workersCompState = workers_comp_state

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update subcontractor
    await convex.mutation(api.subcontractors.update, {
      id: id as Id<"subcontractors">,
      ...updates,
    })

    // Log the action
    await convex.mutation(api.auditLogs.create, {
      companyId: user.companyId!,
      userId: user._id,
      entityType: 'subcontractor',
      entityId: id,
      action: 'update',
      details: {
        name: updates.name || subcontractor.name,
        updatedFields: Object.keys(updates),
      },
    })

    // Get and return updated subcontractor
    const updated = await convex.query(api.subcontractors.getById, {
      id: id as Id<"subcontractors">,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update subcontractor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/subcontractors/[id] - Delete a subcontractor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admin and risk_manager can delete subcontractors
    if (!['admin', 'risk_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins and risk managers can delete subcontractors' }, { status: 403 })
    }

    const { id } = await params

    // Check if subcontractor exists and belongs to user's company
    const subcontractor = await convex.query(api.subcontractors.getById, {
      id: id as Id<"subcontractors">,
    })

    if (!subcontractor || subcontractor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    // Check if subcontractor is assigned to any projects
    const projectAssignments = await convex.query(api.projectSubcontractors.getBySubcontractor, {
      subcontractorId: id as Id<"subcontractors">,
    })

    if (projectAssignments && projectAssignments.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete subcontractor that is assigned to projects. Remove from all projects first.',
        assignedProjects: projectAssignments.length
      }, { status: 400 })
    }

    // Delete the subcontractor
    await convex.mutation(api.subcontractors.remove, {
      id: id as Id<"subcontractors">,
    })

    // Log the action
    await convex.mutation(api.auditLogs.create, {
      companyId: user.companyId!,
      userId: user._id,
      entityType: 'subcontractor',
      entityId: id,
      action: 'delete',
      details: { name: subcontractor.name },
    })

    return NextResponse.json({
      success: true,
      message: 'Subcontractor deleted successfully'
    })

  } catch (error) {
    console.error('Delete subcontractor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
