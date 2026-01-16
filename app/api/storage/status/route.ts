import { NextRequest, NextResponse } from 'next/server'
import { getUserByToken } from '@/lib/auth'
import { getStorageInfo, fileExists } from '@/lib/storage'

// GET /api/storage/status - Get storage configuration status
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Only admins can check storage status
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const storageInfo = getStorageInfo()

    return NextResponse.json({
      storage: {
        provider: storageInfo.provider,
        configured: storageInfo.configured,
        description: storageInfo.configured
          ? 'Convex Storage is configured and active'
          : 'Using local file storage (development mode). Configure NEXT_PUBLIC_CONVEX_URL for Convex Storage.',
        features: {
          upload: true,
          download: true,
          delete: true,
          publicUrls: storageInfo.configured
        }
      }
    })
  } catch (error) {
    console.error('Storage status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
