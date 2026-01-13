import crypto from 'crypto'

/**
 * Encryption utility for securing sensitive data like OAuth tokens
 * Uses AES-256-GCM encryption with a random IV for each encryption
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM recommended IV length
const AUTH_TAG_LENGTH = 16

/**
 * Get the encryption key from environment variable
 * Falls back to a derived key from JWT_SECRET for backwards compatibility
 */
function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY

  if (encryptionKey) {
    // Use the configured encryption key (should be 32 bytes / 64 hex chars)
    if (encryptionKey.length === 64) {
      return Buffer.from(encryptionKey, 'hex')
    }
    // If not hex, hash it to get 32 bytes
    return crypto.createHash('sha256').update(encryptionKey).digest()
  }

  // Fall back to deriving from JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET
  if (jwtSecret) {
    return crypto.createHash('sha256').update(jwtSecret + '-oauth-tokens').digest()
  }

  // Development fallback - NOT FOR PRODUCTION
  console.warn('[Encryption] No TOKEN_ENCRYPTION_KEY or JWT_SECRET found - using development key')
  return crypto.createHash('sha256').update('riskshield-dev-key').digest()
}

/**
 * Encrypt a string value
 * Returns a base64-encoded string containing: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Combine iv + authTag + ciphertext into a single string
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ])

  return combined.toString('base64')
}

/**
 * Decrypt a string value
 * Expects base64-encoded string containing: iv + authTag + ciphertext
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedData, 'base64')

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    })
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext.toString('base64'), 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    // If decryption fails, the data might be unencrypted (legacy)
    // Return as-is for backwards compatibility during migration
    console.warn('[Encryption] Decryption failed, data may be unencrypted legacy format')
    return encryptedData
  }
}

/**
 * Check if a string appears to be encrypted
 * Encrypted strings are longer due to IV and auth tag overhead
 */
export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64')
    // Encrypted values should be at least IV + authTag + some ciphertext
    return decoded.length > IV_LENGTH + AUTH_TAG_LENGTH + 10
  } catch {
    return false
  }
}

/**
 * Encrypt a token, handling legacy unencrypted values
 */
export function encryptToken(token: string): string {
  // Don't double-encrypt
  if (isEncrypted(token)) {
    return token
  }
  return encrypt(token)
}

/**
 * Decrypt a token, handling legacy unencrypted values
 */
export function decryptToken(token: string): string {
  if (!isEncrypted(token)) {
    return token
  }
  return decrypt(token)
}
