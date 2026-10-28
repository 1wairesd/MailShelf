/**
 * Minimal mock of the `electron` module for unit tests running under plain Node.
 *
 * crypto.ts imports `safeStorage` and `app` at module scope. We force
 * `safeStorage.isEncryptionAvailable()` to return false so initCrypto() takes
 * the PBKDF2-from-machine fallback path, which needs no OS keychain and works
 * headless in CI. This exercises the real encrypt/decrypt round-trip against a
 * genuinely derived key.
 */
export const safeStorage = {
  isEncryptionAvailable: (): boolean => false,
  encryptString: (s: string): Buffer => Buffer.from(s, 'utf8'),
  decryptString: (b: Buffer): string => b.toString('utf8'),
}

export const app = {
  getName: (): string => 'mailshelf-test',
}
