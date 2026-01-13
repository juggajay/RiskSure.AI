import { NextResponse } from 'next/server'

/**
 * GET /api/stripe/test
 *
 * Test Stripe connectivity - only for debugging
 * Uses raw fetch to bypass SDK issues
 */
export async function GET() {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY

    console.log('Testing Stripe connectivity...')
    console.log('STRIPE_SECRET_KEY exists:', !!apiKey)
    console.log('STRIPE_SECRET_KEY prefix:', apiKey?.substring(0, 12))
    console.log('STRIPE_SECRET_KEY length:', apiKey?.length)

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Stripe key not configured',
      })
    }

    // Try raw HTTP request to Stripe API
    console.log('Making raw HTTP request to Stripe...')
    const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const data = await response.json()

    console.log('Stripe response status:', response.status)
    console.log('Stripe response:', JSON.stringify(data).substring(0, 200))

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        status: response.status,
        error: data.error?.message || 'Unknown error',
        errorType: data.error?.type,
        errorCode: data.error?.code,
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe connection working via raw HTTP',
      customersFound: data.data?.length || 0,
    })
  } catch (error) {
    console.error('Stripe test error:', error)
    const err = error as { message?: string }
    return NextResponse.json({
      success: false,
      error: err.message || 'Unknown error',
      errorDetails: String(error),
    }, { status: 500 })
  }
}
