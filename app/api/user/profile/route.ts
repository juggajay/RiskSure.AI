import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { getDb } from "@/lib/db"
import { getUserByToken } from "@/lib/auth"

interface DbUser {
  id: string
  email: string
  name: string
  phone: string | null
  avatar_url: string | null
  company_id: string
}

// GET /api/user/profile - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const db = getDb()
    const dbUser = db.prepare(`
      SELECT id, email, name, phone, avatar_url, company_id
      FROM users WHERE id = ?
    `).get(user.id) as DbUser | undefined

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ profile: dbUser })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT /api/user/profile - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const db = getDb()
    const body = await request.json()
    const { name, phone, avatar_url } = body

    // Validate name is provided and not empty
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Validate phone format if provided (basic validation)
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/
      if (!phoneRegex.test(phone)) {
        return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
      }
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: (string | null)[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name.trim())
    }

    if (phone !== undefined) {
      updates.push('phone = ?')
      values.push(phone?.trim() || null)
    }

    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?')
      values.push(avatar_url || null)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    updates.push("updated_at = datetime('now')")
    values.push(user.id)

    db.prepare(`
      UPDATE users SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)

    // Log the action
    const details: Record<string, unknown> = { self_update: true }
    if (name !== undefined) details.name = name
    if (phone !== undefined) details.phone = phone
    if (avatar_url !== undefined) details.avatar_updated = true

    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'user', ?, 'update', ?)
    `).run(uuidv4(), user.company_id, user.id, user.id, JSON.stringify(details))

    // Get updated profile
    const updatedProfile = db.prepare(`
      SELECT id, email, name, phone, avatar_url, company_id
      FROM users WHERE id = ?
    `).get(user.id) as DbUser

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedProfile
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
