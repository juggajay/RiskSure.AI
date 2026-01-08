import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUserByToken } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

// GET /api/notifications - List notifications for current user
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")
    const unreadOnly = searchParams.get("unread") === "true"

    // Get notifications for this user
    let query = `
      SELECT * FROM notifications
      WHERE user_id = ?
      ${unreadOnly ? "AND read = 0" : ""}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const notifications = db.prepare(query).all(user.id, limit, offset)

    // Get unread count
    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND read = 0
    `).get(user.id) as { count: number }

    // Get total count
    const totalCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ?
    `).get(user.id) as { count: number }

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount.count,
      totalCount: totalCount.count
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

// POST /api/notifications - Create a notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = getUserByToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const db = getDb()
    const body = await request.json()

    const {
      userId,
      type,
      title,
      message,
      link,
      entityType,
      entityId
    } = body

    // Get company_id from user
    const targetUserId = userId || currentUser.id
    const targetUser = db.prepare("SELECT company_id FROM users WHERE id = ?").get(targetUserId) as { company_id: string } | undefined
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Security: Prevent IDOR - users can only create notifications for users in their own company
    if (targetUser.company_id !== currentUser.company_id) {
      return NextResponse.json({ error: "Cannot create notifications for users outside your company" }, { status: 403 })
    }

    const id = uuidv4()
    db.prepare(`
      INSERT INTO notifications (id, user_id, company_id, type, title, message, link, entity_type, entity_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, targetUserId, targetUser.company_id, type, title, message, link || null, entityType || null, entityId || null)

    return NextResponse.json({ id, success: true })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
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
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      // Mark all notifications as read for this user
      db.prepare(`
        UPDATE notifications
        SET read = 1
        WHERE user_id = ? AND read = 0
      `).run(user.id)

      return NextResponse.json({ success: true, message: "All notifications marked as read" })
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      const placeholders = notificationIds.map(() => "?").join(", ")
      db.prepare(`
        UPDATE notifications
        SET read = 1
        WHERE id IN (${placeholders}) AND user_id = ?
      `).run(...notificationIds, user.id)

      return NextResponse.json({ success: true, message: "Notifications marked as read" })
    }

    return NextResponse.json({ error: "No notification IDs provided" }, { status: 400 })
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 })
  }
}

// DELETE /api/notifications - Clear all notifications
export async function DELETE(request: NextRequest) {
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

    // Delete all notifications for this user
    db.prepare(`
      DELETE FROM notifications
      WHERE user_id = ?
    `).run(user.id)

    return NextResponse.json({ success: true, message: "All notifications cleared" })
  } catch (error) {
    console.error("Error clearing notifications:", error)
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 })
  }
}
