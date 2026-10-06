import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-cbc'

function getEncryptionKey(): Buffer {
  const secret = process.env.AADHAAR_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'default_aadhaar_secret_key_32bytes_long!'
  return crypto.createHash('sha256').update(secret).digest()
}

export function validateAadhaarNumber(aadhaar: string): void {
  const aadhaarRegex = /^[0-9]{12}$/
  if (!aadhaar || !aadhaarRegex.test(aadhaar)) {
    throw new Error('Aadhaar number must contain exactly 12 digits.')
  }
}

export function encryptAadhaar(aadhaarNumber: string): string {
  validateAadhaarNumber(aadhaarNumber)
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(aadhaarNumber, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

export function decryptAadhaar(encryptedAadhaar: string): string {
  try {
    const key = getEncryptionKey()
    const parts = encryptedAadhaar.split(':')
    const ivHex = parts[0]
    const encryptedText = parts.slice(1).join(':')
    if (!ivHex || !encryptedText) {
      return encryptedAadhaar
    }
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== 16) {
      return encryptedAadhaar
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return encryptedAadhaar
  }
}

export function maskAadhaar(aadhaarNumber: string): string {
  if (!aadhaarNumber) return ''
  // If input is an encrypted string, try decrypting first
  const plainAadhaar = aadhaarNumber.includes(':') ? decryptAadhaar(aadhaarNumber) : aadhaarNumber
  if (plainAadhaar.length >= 4) {
    const lastFour = plainAadhaar.slice(-4)
    return 'XXXXXXXX' + lastFour
  }
  return plainAadhaar
}
