import { NextRequest, NextResponse } from 'next/server'
import { getUserByToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import {
  getProcoreConfig,
  isProcoreDevMode,
  MOCK_PROCORE_COMPANIES,
} from '@/lib/procore'

interface OAuthConnection {
  id: string
  company_id: string
  provider: string
  access_token: string
  refresh_token: string | null
  pending_company_selection: number
}

interface SelectCompanyBody {
  procoreCompanyId: number
}

/**
 * POST /api/integrations/procore/select-company
 *
 * Completes the Procore connection by selecting which Procore company to use.
 * Required when the user has access to multiple Procore companies.
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

    // Only admins can manage integrations
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json() as SelectCompanyBody
    const { procoreCompanyId } = body

    if (!procoreCompanyId || typeof procoreCompanyId !== 'number') {
      return NextResponse.json({
        error: 'procoreCompanyId is required and must be a number',
      }, { status: 400 })
    }

    const db = getDb()

    // Get existing Procore connection
    const connection = db.prepare(`
      SELECT * FROM oauth_connections
      WHERE company_id = ? AND provider = 'procore'
    `).get(user.company_id) as OAuthConnection | undefined

    if (!connection) {
      return NextResponse.json({
        error: 'No Procore connection found. Please connect first.',
      }, { status: 404 })
    }

    // Verify the company ID is valid by fetching company details
    const config = getProcoreConfig()
    const isDevMode = isProcoreDevMode()

    let companyName: string

    if (isDevMode) {
      const mockCompany = MOCK_PROCORE_COMPANIES.find(c => c.id === procoreCompanyId)
      if (!mockCompany) {
        return NextResponse.json({
          error: 'Invalid Procore company ID',
        }, { status: 400 })
      }
      companyName = mockCompany.name
    } else {
      // Verify with Procore API
      const response = await fetch(`${config.apiBaseUrl}/rest/v1.0/companies`, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      })

      if (!response.ok) {
        return NextResponse.json({
          error: 'Failed to verify Procore company',
        }, { status: 502 })
      }

      const companies = await response.json() as Array<{ id: number; name: string }>
      const selectedCompany = companies.find(c => c.id === procoreCompanyId)

      if (!selectedCompany) {
        return NextResponse.json({
          error: 'Invalid Procore company ID - you do not have access to this company',
        }, { status: 403 })
      }

      companyName = selectedCompany.name
    }

    // Update the connection with the selected company
    db.prepare(`
      UPDATE oauth_connections
      SET
        procore_company_id = ?,
        procore_company_name = ?,
        pending_company_selection = 0,
        updated_at = datetime('now')
      WHERE company_id = ? AND provider = 'procore'
    `).run(procoreCompanyId, companyName, user.company_id)

    // Create audit log entry
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'integration', 'procore', 'select_company', ?)
    `).run(
      uuidv4(),
      user.company_id,
      user.id,
      JSON.stringify({
        procore_company_id: procoreCompanyId,
        procore_company_name: companyName,
      })
    )

    console.log(`[Procore] Company "${companyName}" (ID: ${procoreCompanyId}) selected for Shield-AI company ${user.company_id}`)

    return NextResponse.json({
      success: true,
      message: `Connected to Procore company: ${companyName}`,
      procoreCompanyId,
      procoreCompanyName: companyName,
    })
  } catch (error) {
    console.error('Procore select company error:', error)
    return NextResponse.json(
      { error: 'Failed to select Procore company' },
      { status: 500 }
    )
  }
}
