import { NextResponse } from 'next/server'
import { getUserByToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

/**
 * POST /api/integrations/procore/disconnect
 *
 * Disconnects the Procore integration for the user's company.
 * Removes OAuth tokens and optionally clears sync mappings.
 */
export async function POST() {
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

    const db = getDb()

    // Get connection details for audit log
    const connection = db.prepare(`
      SELECT procore_company_id, procore_company_name
      FROM oauth_connections
      WHERE company_id = ? AND provider = 'procore'
    `).get(user.company_id) as { procore_company_id: number | null; procore_company_name: string | null } | undefined

    // Delete the OAuth connection
    const result = db.prepare(`
      DELETE FROM oauth_connections
      WHERE company_id = ? AND provider = 'procore'
    `).run(user.company_id)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'No Procore connection found' }, { status: 404 })
    }

    // Optionally clear sync mappings (mark as paused, don't delete)
    db.prepare(`
      UPDATE procore_mappings
      SET sync_status = 'paused', updated_at = datetime('now')
      WHERE company_id = ?
    `).run(user.company_id)

    // Create audit log entry
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'integration', 'procore', 'disconnect', ?)
    `).run(
      uuidv4(),
      user.company_id,
      user.id,
      JSON.stringify({
        procore_company_id: connection?.procore_company_id,
        procore_company_name: connection?.procore_company_name,
      })
    )

    console.log(`[Procore] Disconnected for Shield-AI company ${user.company_id}`)

    return NextResponse.json({
      success: true,
      message: 'Procore disconnected successfully',
    })
  } catch (error) {
    console.error('Procore disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Procore' },
      { status: 500 }
    )
  }
}
