import { NextRequest, NextResponse } from 'next/server'

// Test endpoint that simulates a slow API call
// Used for testing timeout handling in the UI
export async function GET(request: NextRequest) {
  // Security: Block test endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoints are disabled in production' }, { status: 403 })
  }
  const searchParams = request.nextUrl.searchParams
  const delay = parseInt(searchParams.get('delay') || '5000', 10)

  // Cap delay at 60 seconds for safety
  const actualDelay = Math.min(delay, 60000)

  // Wait for the specified delay
  await new Promise(resolve => setTimeout(resolve, actualDelay))

  return NextResponse.json({
    message: 'Slow response completed',
    delay: actualDelay
  })
}
