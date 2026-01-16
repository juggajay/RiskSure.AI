import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'
import type { Id } from '@/convex/_generated/dataModel'

// GET /api/communications - List all communications
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const convex = getConvex()

    // Get user session from Convex
    const sessionData = await convex.query(api.auth.getUserWithSession, { token })
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { user, company } = sessionData
    if (!company) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 404 })
    }

    // Get communications for this company's projects
    const comms = await convex.query(api.communications.listByCompany, {
      companyId: company._id as Id<"companies">,
      limit: 100,
    })

    // Convert to legacy format for API compatibility
    const communications = comms.map((c: any) => ({
      id: c._id,
      subcontractor_id: c.subcontractorId,
      project_id: c.projectId,
      verification_id: c.verificationId || null,
      type: c.type,
      channel: c.channel,
      recipient_email: c.recipientEmail || null,
      cc_emails: c.ccEmails || null,
      subject: c.subject || null,
      body: c.body || null,
      status: c.status,
      sent_at: c.sentAt ? new Date(c.sentAt).toISOString() : null,
      delivered_at: c.deliveredAt ? new Date(c.deliveredAt).toISOString() : null,
      opened_at: c.openedAt ? new Date(c.openedAt).toISOString() : null,
      created_at: new Date(c._creationTime).toISOString(),
      updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
      subcontractor_name: c.subcontractor_name || null,
      project_name: c.project_name || null,
    }))

    return NextResponse.json({ communications })
  } catch (error) {
    console.error('Get communications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
