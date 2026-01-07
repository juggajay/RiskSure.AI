import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  isPublicPath,
  isApiRoute,
  isDashboardRoute,
  isPortalRoute,
  isBrokerRoute,
  verifyTokenFromRequest
} from './lib/middleware-auth'

/**
 * Next.js Middleware for centralized authentication
 *
 * This middleware runs on every request and:
 * 1. Allows public paths through without authentication
 * 2. Verifies JWT tokens for protected routes
 * 3. Redirects unauthenticated users appropriately
 * 4. Returns 401 for unauthenticated API requests
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths through without authentication check
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check authentication for protected routes
  const { valid, error } = await verifyTokenFromRequest(request)

  // Handle unauthenticated requests
  if (!valid) {
    // API routes return 401 JSON response
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Not authenticated', details: error },
        { status: 401 }
      )
    }

    // Portal routes redirect to portal login
    if (isPortalRoute(pathname)) {
      const loginUrl = new URL('/portal/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Broker routes redirect to portal login (brokers use portal auth)
    if (isBrokerRoute(pathname)) {
      const loginUrl = new URL('/portal/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Dashboard and other protected routes redirect to main login
    if (isDashboardRoute(pathname)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Default: redirect to main login for any other protected route
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated - allow request to proceed
  return NextResponse.next()
}

/**
 * Configure which paths the middleware should run on
 *
 * This matcher excludes:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (browser favicon)
 * - public folder assets
 *
 * The middleware will run on all other paths
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
