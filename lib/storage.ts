/**
 * Unified File Storage Library
 *
 * Provides a consistent API for file storage operations.
 * - Uses Supabase Storage when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured
 * - Falls back to local file storage in development mode
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Storage bucket name for COC documents
const COC_BUCKET = 'coc-documents'

// Check if Supabase is configured
function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Consider configured only if both URL and service role key are real values
  // (not just 'test' or empty)
  return !!(
    supabaseUrl &&
    supabaseServiceKey &&
    supabaseUrl !== 'test' &&
    supabaseServiceKey !== 'test' &&
    supabaseUrl.includes('supabase')
  )
}

// Create Supabase client for storage operations
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Get the app URL for constructing file URLs
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export interface UploadResult {
  success: boolean
  fileUrl: string
  storagePath: string
  provider: 'supabase' | 'local'
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

  if (isSupabaseConfigured()) {
    // Use Supabase Storage
    try {
      const supabase = getSupabaseClient()

      // Ensure bucket exists (create if not)
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.name === COC_BUCKET)

      if (!bucketExists) {
        await supabase.storage.createBucket(COC_BUCKET, {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        })
      }

      // Upload file
      const { data, error } = await supabase.storage
        .from(COC_BUCKET)
        .upload(storagePath, buffer, {
          contentType,
          upsert: false
        })

      if (error) {
        console.error('Supabase upload error:', error)
        return {
          success: false,
          fileUrl: '',
          storagePath: '',
          provider: 'supabase',
          error: error.message
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(COC_BUCKET)
        .getPublicUrl(storagePath)

      console.log(`[STORAGE] File uploaded to Supabase: ${storagePath}`)

      return {
        success: true,
        fileUrl: urlData.publicUrl,
        storagePath,
        provider: 'supabase'
      }
    } catch (error) {
      console.error('Supabase storage error:', error)
      // Fall back to local storage
      console.log('[STORAGE] Falling back to local storage due to Supabase error')
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
 * @param storagePath - Path to file in storage
 * @returns Download result with file buffer
 */
export async function downloadFile(storagePath: string): Promise<DownloadResult> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase.storage
        .from(COC_BUCKET)
        .download(storagePath)

      if (error) {
        console.error('Supabase download error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      const buffer = Buffer.from(await data.arrayBuffer())

      return {
        success: true,
        buffer,
        contentType: data.type
      }
    } catch (error) {
      console.error('Supabase download error:', error)
      // Fall back to local storage
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
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()

      const { error } = await supabase.storage
        .from(COC_BUCKET)
        .remove([storagePath])

      if (error) {
        console.error('Supabase delete error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      console.log(`[STORAGE] File deleted from Supabase: ${storagePath}`)
      return { success: true }
    } catch (error) {
      console.error('Supabase delete error:', error)
      // Fall back to local storage
    }
  }

  // Local file storage
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

  // If Supabase is configured, construct Supabase URL
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()
    const { data } = supabase.storage
      .from(COC_BUCKET)
      .getPublicUrl(storagePath)
    return data.publicUrl
  }

  // Default to local URL
  const appUrl = getAppUrl()
  return `${appUrl}/uploads/${storagePath}`
}

/**
 * Check if file exists in storage
 *
 * @param storagePath - Path to file in storage
 * @returns True if file exists
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.storage
        .from(COC_BUCKET)
        .list(path.dirname(storagePath))

      if (error) return false

      const fileName = path.basename(storagePath)
      return data.some(file => file.name === fileName)
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
  provider: 'supabase' | 'local'
  configured: boolean
  bucket: string
} {
  const configured = isSupabaseConfigured()
  return {
    provider: configured ? 'supabase' : 'local',
    configured,
    bucket: COC_BUCKET
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
