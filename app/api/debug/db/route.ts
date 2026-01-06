import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// This endpoint is for debugging only - remove in production
export async function GET() {
  try {
    const db = getDb()

    const users = db.prepare('SELECT id, email, name, role, company_id, created_at FROM users').all()
    const companies = db.prepare('SELECT id, name, abn, created_at FROM companies').all()
    const sessions = db.prepare('SELECT id, user_id, expires_at FROM sessions').all()

    return NextResponse.json({
      users,
      companies,
      sessions,
      counts: {
        users: users.length,
        companies: companies.length,
        sessions: sessions.length
      }
    })
  } catch (error) {
    console.error('Debug DB error:', error)
    return NextResponse.json({ error: 'Failed to query database' }, { status: 500 })
  }
}
