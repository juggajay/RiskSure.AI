import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserByToken } from "@/lib/auth"
import { sendEmail, isEmailConfigured, textToHtml } from "@/lib/resend"

// Note: This endpoint is kept at /sendgrid for backwards compatibility
// but now uses Resend as the email provider

export async function POST() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: "Resend API key not configured. Set RESEND_API_KEY in environment variables." },
        { status: 400 }
      )
    }

    const apiKey = process.env.RESEND_API_KEY

    // In development mode with test key, simulate success
    if (process.env.NODE_ENV === "development" && (apiKey === "test" || apiKey === "dev")) {
      console.log("[DEV MODE] Resend test email simulated")
      return NextResponse.json({
        success: true,
        message: "Test email simulated (development mode)"
      })
    }

    // Send actual test email via Resend
    const testBody = `Email Integration Test

This is a test email from RiskShield AI to verify your Resend email integration is working correctly.

Sent at: ${new Date().toISOString()}`

    const result = await sendEmail({
      to: user.email,
      subject: "RiskShield AI - Email Integration Test",
      html: textToHtml(testBody),
      text: testBody
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully via Resend",
        messageId: result.messageId
      })
    } else {
      console.error("Resend API error:", result.error)
      return NextResponse.json(
        { error: result.error || "Resend API returned an error. Please verify your API key." },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Email test failed:", error)
    return NextResponse.json(
      { error: "Failed to test email connection" },
      { status: 500 }
    )
  }
}
