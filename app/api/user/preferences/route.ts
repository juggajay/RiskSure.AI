import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUserByToken } from "@/lib/auth"

// Default notification preferences
const DEFAULT_PREFERENCES = {
  emailDigest: 'immediate', // 'immediate' | 'daily' | 'weekly' | 'none'
  emailNotifications: {
    cocReceived: true,
    cocVerified: true,
    cocFailed: true,
    expirationWarning: true,
    stopWorkRisk: true,
    communicationSent: true,
    exceptionUpdates: true
  },
  inAppNotifications: {
    cocReceived: true,
    cocVerified: true,
    cocFailed: true,
    expirationWarning: true,
    stopWorkRisk: true,
    communicationSent: true,
    exceptionUpdates: true
  },
  expirationWarningDays: 30 // Days before expiration to receive warning
}

// GET /api/user/preferences - Get user notification preferences
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
    const dbUser = db.prepare("SELECT notification_preferences FROM users WHERE id = ?").get(user.id) as { notification_preferences: string } | undefined

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse preferences or use defaults
    let preferences = DEFAULT_PREFERENCES
    if (dbUser.notification_preferences && dbUser.notification_preferences !== '{}') {
      try {
        const stored = JSON.parse(dbUser.notification_preferences)
        preferences = { ...DEFAULT_PREFERENCES, ...stored }
      } catch {
        // Use defaults if parsing fails
      }
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error("Error fetching preferences:", error)
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
  }
}

// PUT /api/user/preferences - Update user notification preferences
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

    // Validate email digest value
    const validDigestOptions = ['immediate', 'daily', 'weekly', 'none']
    if (body.emailDigest && !validDigestOptions.includes(body.emailDigest)) {
      return NextResponse.json({ error: "Invalid email digest option" }, { status: 400 })
    }

    // Get current preferences
    const dbUser = db.prepare("SELECT notification_preferences FROM users WHERE id = ?").get(user.id) as { notification_preferences: string } | undefined

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Merge with existing preferences
    let currentPreferences = DEFAULT_PREFERENCES
    if (dbUser.notification_preferences && dbUser.notification_preferences !== '{}') {
      try {
        currentPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(dbUser.notification_preferences) }
      } catch {
        // Use defaults if parsing fails
      }
    }

    const newPreferences = {
      ...currentPreferences,
      ...body,
      emailNotifications: {
        ...currentPreferences.emailNotifications,
        ...(body.emailNotifications || {})
      },
      inAppNotifications: {
        ...currentPreferences.inAppNotifications,
        ...(body.inAppNotifications || {})
      }
    }

    // Save preferences
    db.prepare("UPDATE users SET notification_preferences = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(newPreferences), user.id)

    return NextResponse.json({
      success: true,
      preferences: newPreferences,
      message: "Preferences saved successfully"
    })
  } catch (error) {
    console.error("Error updating preferences:", error)
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 })
  }
}
