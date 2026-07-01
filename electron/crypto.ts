import { safeStorage, app } from 'electron'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const ALGORITHM = 'aes-256-gcm'
const KEY_FILE = 'master.key'
const IV_LENGTH = 12           // 96-bit IV — optimal for GCM
const AUTH_TAG_LENGTH = 16     // bytes, GCM standard

let masterKey: Buffer | null = null

/**
 * Load or generate the master encryption key.
 * Protected by Electron safeStorage (DPAPI on Windows, Keychain on macOS, libsecret on Linux).
 */
export function initCrypto(userDataPath: string): void {
  const keyPath = path.join(userDataPath, KEY_FILE)

  if (safeStorage.isEncryptionAvailable()) {
    if (fs.existsSync(keyPath)) {
      try {
        const encryptedKey = fs.readFileSync(keyPath)
        const keyBase64 = safeStorage.decryptString(encryptedKey)
        masterKey = Buffer.from(keyBase64, 'base64')
        if (masterKey.length !== 32) throw new Error('Invalid key length')
        return
      } catch {
        // Key corrupted or wrong — generate new one.
        // Existing encrypted data will be unreadable, but security is maintained.
        try { fs.unlinkSync(keyPath) } catch { /* ignore */ }
      }
    }

    const newKey = crypto.randomBytes(32)
    const encryptedKey = safeStorage.encryptString(newKey.toString('base64'))
    fs.writeFileSync(keyPath, encryptedKey, { mode: 0o600 })
    masterKey = newKey
  } else {
    // Fallback: PBKDF2 with stored salt.
    // Less secure than safeStorage but better than plaintext.
    console.warn(
      '[MailShelf] safeStorage is unavailable on this system. ' +
      'Passwords are protected with PBKDF2 derived from machine identifiers. ' +
      'This is weaker than OS keychain protection. ' +
      'Consider running the app in a desktop session with a keyring service (libsecret/KWallet on Linux).'
    )
    masterKey = deriveKeyFromMachine(userDataPath)
  }
}

function deriveKeyFromMachine(userDataPath: string): Buffer {
  const saltPath = path.join(userDataPath, 'salt.bin')
  let salt: Buffer

  if (fs.existsSync(saltPath)) {
    salt = fs.readFileSync(saltPath)
    if (salt.length < 32) {
      salt = crypto.randomBytes(32)
      fs.writeFileSync(saltPath, salt, { mode: 0o600 })
    }
  } else {
    salt = crypto.randomBytes(32)
    fs.writeFileSync(saltPath, salt, { mode: 0o600 })
  }

  const appName = app.getName() || 'mailshelf'
  const machineId = [
    process.env.USERNAME,
    process.env.COMPUTERNAME,
    process.env.USER,
    process.env.HOSTNAME,
  ].filter(Boolean).join('|') || 'default'

  return crypto.pbkdf2Sync(`${appName}:${machineId}`, salt, 200_000, 32, 'sha256')
}

/**
 * Encrypt a plaintext string.
 * Returns format: base64(iv):base64(authTag):base64(ciphertext)
 * Returns null if plaintext is empty (empty string is stored as-is, not encrypted).
 */
export function encrypt(plaintext: string): string | null {
  if (!masterKey) throw new Error('Crypto not initialized')
  if (!plaintext) return null

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Decrypt a string produced by encrypt().
 * Returns null on failure — never throws to avoid oracle attacks.
 * Returns null for null/empty input (mirrors encrypt behaviour).
 */
export function decrypt(ciphertext: string | null): string | null {
  if (!masterKey) throw new Error('Crypto not initialized')
  if (!ciphertext) return null

  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    // Legacy plaintext — return as-is for backward compatibility
    return ciphertext
  }

  try {
    const iv        = Buffer.from(parts[0], 'base64')
    const authTag   = Buffer.from(parts[1], 'base64')
    const encrypted = Buffer.from(parts[2], 'base64')

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) return null

    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAuthTag(authTag)

    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
  } catch {
    // Don't log decryption errors — avoids timing/oracle information leakage
    return null
  }
}

/**
 * Securely zero out the master key from memory.
 * Call on app quit (before-quit event).
 */
export function clearCrypto(): void {
  if (masterKey) {
    masterKey.fill(0)
    masterKey = null
  }
}

export function isCryptoReady(): boolean {
  return masterKey !== null
}
