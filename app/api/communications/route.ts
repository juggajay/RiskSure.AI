import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'

interface Communication {
  id: string
  subcontractor_id: string
  project_id: string
  verification_id: string | null
  type: 'deficiency' | 'follow_up' | 'confirmation' | 'expiration_reminder' | 'critical_alert'
  channel: 'email' | 'sms'
  recipient_email: string | null
  cc_emails: string | null
  subject: string | null
  body: string | null
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed'
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  subcontractor_name?: string
  project_name?: string
}

// GET /api/communications - List all communications
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const db = getDb()

    // Get communications for this company's projects
    const communications = db.prepare(`
      SELECT
        c.*,
        s.name as subcontractor_name,
        p.name as project_name
      FROM communications c
      JOIN subcontractors s ON c.subcontractor_id = s.id
      JOIN projects p ON c.project_id = p.id
      WHERE p.company_id = ?
      ORDER BY c.created_at DESC
      LIMIT 100
    `).all(user.company_id) as Communication[]

    return NextResponse.json({ communications })
  } catch (error) {
    console.error('Get communications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
