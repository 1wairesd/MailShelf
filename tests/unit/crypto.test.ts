import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { initCrypto, encrypt, decrypt, clearCrypto, isCryptoReady } from '../../electron/crypto'

// crypto.ts imports `electron` at module scope; vitest.config.ts aliases it to
// tests/mocks/electron.ts, whose safeStorage.isEncryptionAvailable() returns
// false. That drives initCrypto() down the PBKDF2-from-machine fallback, which
// derives a real 32-byte key and needs only a writable dir for salt.bin.

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailshelf-crypto-'))
  // Silence the expected "safeStorage unavailable" warning banner.
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  initCrypto(tmpDir)
})

afterAll(() => {
  clearCrypto()
  fs.rmSync(tmpDir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('initCrypto', () => {
  it('marks crypto as ready', () => {
    expect(isCryptoReady()).toBe(true)
  })

  it('writes a salt file for the fallback key derivation', () => {
    expect(fs.existsSync(path.join(tmpDir, 'salt.bin'))).toBe(true)
  })

  it('reports the fallback result when safeStorage is unavailable', () => {
    // The electron mock forces isEncryptionAvailable() = false, so a second
    // init in a fresh dir takes the PBKDF2 fallback path.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailshelf-crypto-fb-'))
    try {
      expect(initCrypto(dir)).toBe('fallback')
    } finally {
      // Restore the key the rest of the suite relies on.
      initCrypto(tmpDir)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('encrypt / decrypt round-trip', () => {
  it('recovers a simple plaintext', () => {
    const secret = 'hunter2'
    const ct = encrypt(secret)
    expect(ct).not.toBeNull()
    expect(decrypt(ct)).toBe(secret)
  })

  it('recovers unicode and special characters', () => {
    const secret = 'пароль🔐 with "quotes", commas, and\nnewlines'
    expect(decrypt(encrypt(secret))).toBe(secret)
  })

  it('produces the documented iv:authTag:ciphertext format', () => {
    const ct = encrypt('abc')
    expect(ct).not.toBeNull()
    const parts = (ct as string).split(':')
    expect(parts).toHaveLength(3)
    // iv is 12 bytes, authTag is 16 bytes — base64 lengths are fixed
    expect(Buffer.from(parts[0], 'base64')).toHaveLength(12)
    expect(Buffer.from(parts[1], 'base64')).toHaveLength(16)
  })

  it('uses a fresh IV each call (same plaintext -> different ciphertext)', () => {
    const a = encrypt('same-input')
    const b = encrypt('same-input')
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe(decrypt(b))
  })
})

describe('edge cases', () => {
  it('returns null when encrypting an empty string', () => {
    expect(encrypt('')).toBeNull()
  })

  it('returns null when decrypting null or empty input', () => {
    expect(decrypt(null)).toBeNull()
    expect(decrypt('')).toBeNull()
  })

  it('returns legacy plaintext (no separators) unchanged for backward compat', () => {
    expect(decrypt('legacy-plaintext-password')).toBe('legacy-plaintext-password')
  })

  it('returns null (never throws) on a tampered auth tag', () => {
    const ct = encrypt('tamper-me') as string
    const [iv, , data] = ct.split(':')
    const forgedTag = Buffer.alloc(16, 0).toString('base64')
    const tampered = [iv, forgedTag, data].join(':')
    expect(decrypt(tampered)).toBeNull()
  })

  it('returns null when a 3-part ciphertext has a wrong-length iv/authTag', () => {
    const shortIv = Buffer.alloc(4).toString('base64')      // not 12 bytes
    const shortTag = Buffer.alloc(4).toString('base64')     // not 16 bytes
    const data = Buffer.from('x').toString('base64')
    expect(decrypt([shortIv, shortTag, data].join(':'))).toBeNull()
  })
})
