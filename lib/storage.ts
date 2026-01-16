/**
 * Unified File Storage Library
 *
 * Provides a consistent API for file storage operations.
 * - Uses Convex Storage when NEXT_PUBLIC_CONVEX_URL is configured
 * - Falls back to local file storage in development mode
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Check if Convex is configured
function isConvexConfigured(): boolean {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  return !!(convexUrl && convexUrl.includes('convex'))
}

// Create Convex client for storage operations
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  }
  return new ConvexHttpClient(convexUrl)
}

// Get the app URL for constructing file URLs
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export interface UploadResult {
  success: boolean
  fileUrl: string
  storagePath: string
  storageId?: string
  provider: 'convex' | 'local'
  error?: string
}

export interface DownloadResult {
  success: boolean
  buffer?: Buffer
  contentType?: string
  error?: string
}

export interface DeleteResult {
  success: boolean
  error?: string
}

/**
 * Upload a file to storage
 *
 * @param buffer - File content as Buffer
 * @param fileName - Original filename
 * @param options - Upload options
 * @returns Upload result with file URL
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  options?: {
    folder?: string
    contentType?: string
  }
): Promise<UploadResult> {
  const folder = options?.folder || 'documents'
  const fileExt = path.extname(fileName)
  const uniqueFilename = `${uuidv4()}${fileExt}`
  const storagePath = `${folder}/${uniqueFilename}`

  // Detect content type
  const contentType = options?.contentType || detectContentType(fileName)

  if (isConvexConfigured()) {
    // Use Convex Storage
    try {
      const convex = getConvexClient()

      // Get upload URL from Convex
      const uploadUrl = await convex.mutation(api.documents.generateUploadUrl, {})

      // Upload file to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: new Uint8Array(buffer),
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      const { storageId } = await uploadResponse.json()

      // Get the public URL for the uploaded file
      const fileUrl = await convex.query(api.documents.getFileUrl, { storageId })

      console.log(`[STORAGE] File uploaded to Convex: ${storageId}`)

      return {
        success: true,
        fileUrl: fileUrl || '',
        storagePath,
        storageId,
        provider: 'convex'
      }
    } catch (error) {
      console.error('Convex storage error:', error)
      // Fall back to local storage
      console.log('[STORAGE] Falling back to local storage due to Convex error')
    }
  }

  // Local file storage (development mode)
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, uniqueFilename)
    fs.writeFileSync(filePath, buffer)

    const fileUrl = `/uploads/${folder}/${uniqueFilename}`

    console.log(`[STORAGE] File uploaded locally (dev mode): ${fileUrl}`)

    return {
      success: true,
      fileUrl,
      storagePath,
      provider: 'local'
    }
  } catch (error) {
    console.error('Local storage error:', error)
    return {
      success: false,
      fileUrl: '',
      storagePath: '',
      provider: 'local',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Download a file from storage
 *
 * @param storagePath - Path to file in storage OR a full URL
 * @returns Download result with file buffer
 */
export async function downloadFile(storagePath: string): Promise<DownloadResult> {
  // If it's a full URL (Convex or any HTTP URL), fetch it directly
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    try {
      const response = await fetch(storagePath)

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download: ${response.statusText}`
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const contentType = response.headers.get('content-type') || detectContentType(storagePath)

      return {
        success: true,
        buffer,
        contentType
      }
    } catch (error) {
      console.error('URL download error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Local file storage
  try {
    // Extract folder and filename from storage path
    const filePath = path.join(process.cwd(), 'public', 'uploads', storagePath)

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'File not found'
      }
    }

    const buffer = fs.readFileSync(filePath)
    const contentType = detectContentType(storagePath)

    return {
      success: true,
      buffer,
      contentType
    }
  } catch (error) {
    console.error('Local download error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete a file from storage
 *
 * @param storagePath - Path to file in storage
 * @returns Delete result
 */
export async function deleteFile(storagePath: string): Promise<DeleteResult> {
  // For Convex storage, files are managed through the documents API
  // Deletion should be handled by deleting the document record
  // which will orphan the storage file (Convex handles cleanup)

  // For local files, delete directly
  if (!storagePath.startsWith('http://') && !storagePath.startsWith('https://')) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'uploads', storagePath)

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`[STORAGE] File deleted locally: ${storagePath}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Local delete error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // For remote URLs, we can't delete directly - return success
  // The file should be cleaned up when the document is deleted from Convex
  console.log(`[STORAGE] Remote file deletion skipped (handled by Convex): ${storagePath}`)
  return { success: true }
}

/**
 * Get file URL - converts storage path to accessible URL
 *
 * @param storagePath - Path in storage or local URL
 * @returns Accessible URL
 */
export function getFileUrl(storagePath: string): string {
  // If already a full URL, return as-is
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath
  }

  // If a local path starting with /uploads, construct full URL
  if (storagePath.startsWith('/uploads/')) {
    const appUrl = getAppUrl()
    return `${appUrl}${storagePath}`
  }

  // Default to local URL
  const appUrl = getAppUrl()
  return `${appUrl}/uploads/${storagePath}`
}

/**
 * Check if file exists in storage
 *
 * @param storagePath - Path to file in storage or URL
 * @returns True if file exists
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  // For remote URLs, try a HEAD request
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    try {
      const response = await fetch(storagePath, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }

  // Local file check
  const filePath = path.join(process.cwd(), 'public', 'uploads', storagePath)
  return fs.existsSync(filePath)
}

/**
 * Get storage provider info
 *
 * @returns Current storage provider configuration
 */
export function getStorageInfo(): {
  provider: 'convex' | 'local'
  configured: boolean
} {
  const configured = isConvexConfigured()
  return {
    provider: configured ? 'convex' : 'local',
    configured
  }
}

// Helper to detect content type from filename
function detectContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain'
  }
  return contentTypes[ext] || 'application/octet-stream'
}
