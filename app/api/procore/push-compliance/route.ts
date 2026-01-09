import { NextRequest, NextResponse } from 'next/server'
import { getUserByToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { pushComplianceToProcore, getCompliancePushHistory } from '@/lib/procore/hooks'

interface PushComplianceBody {
  subcontractorId: string
  verificationId?: string // If not provided, uses the latest verification
}

interface Verification {
  id: string
  status: string
}

/**
 * POST /api/procore/push-compliance
 *
 * Manually triggers a compliance status push to Procore for a subcontractor.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = (await cookieStore).get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and risk managers can push compliance
    if (!['admin', 'risk_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin or risk manager access required' }, { status: 403 })
    }

    const body = await request.json() as PushComplianceBody
    let { subcontractorId, verificationId } = body

    if (!subcontractorId) {
      return NextResponse.json({
        error: 'subcontractorId is required',
      }, { status: 400 })
    }

    const db = getDb()

    // Verify subcontractor belongs to user's company
    const subcontractor = db.prepare(`
      SELECT id, name, company_id FROM subcontractors WHERE id = ?
    `).get(subcontractorId) as { id: string; name: string; company_id: string } | undefined

    if (!subcontractor) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    if (subcontractor.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Access denied to this subcontractor' }, { status: 403 })
    }

    // If no verification ID provided, get the latest one
    if (!verificationId) {
      const latestVerification = db.prepare(`
        SELECT id, status FROM verifications
        WHERE subcontractor_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(subcontractorId) as Verification | undefined

      if (!latestVerification) {
        return NextResponse.json({
          error: 'No verifications found for this subcontractor',
        }, { status: 404 })
      }

      verificationId = latestVerification.id
    }

    // Push compliance status
    const result = await pushComplianceToProcore(
      user.company_id!,
      subcontractorId,
      verificationId
    )

    if (result.pushed) {
      return NextResponse.json({
        success: true,
        message: result.message,
        procoreVendorId: result.procoreVendorId,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Procore push compliance error:', error)
    return NextResponse.json(
      { error: 'Failed to push compliance to Procore' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/procore/push-compliance
 *
 * Gets the compliance push history for a subcontractor.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = (await cookieStore).get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subcontractorId = searchParams.get('subcontractorId')

    if (!subcontractorId) {
      return NextResponse.json({
        error: 'subcontractorId query parameter is required',
      }, { status: 400 })
    }

    const db = getDb()

    // Verify subcontractor belongs to user's company
    const subcontractor = db.prepare(`
      SELECT company_id FROM subcontractors WHERE id = ?
    `).get(subcontractorId) as { company_id: string } | undefined

    if (!subcontractor) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    if (subcontractor.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Access denied to this subcontractor' }, { status: 403 })
    }

    // Get push history
    const history = getCompliancePushHistory(user.company_id!, subcontractorId)

    // Parse details JSON
    const parsedHistory = history.map(h => ({
      ...h,
      details: JSON.parse(h.details || '{}'),
    }))

    return NextResponse.json({
      history: parsedHistory,
    })
  } catch (error) {
    console.error('Procore push compliance history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compliance push history' },
      { status: 500 }
    )
  }
}
