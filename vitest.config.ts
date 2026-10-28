import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Vitest configuration for MailShelf unit tests.
 *
 * Tests run under plain Node (not Electron), so two things matter:
 *
 * 1. `electron` is aliased to a lightweight mock (tests/mocks/electron.ts).
 *    The real module can only load inside an Electron runtime, and crypto.ts
 *    imports it at module scope.
 *
 * 2. We only test pure/logic code here — the scheduler date math, the tag-rule
 *    firing guard (against an in-memory fake DB), and the crypto round-trip.
 *    Nothing in this suite touches the native better-sqlite3 binding, which is
 *    compiled against the Electron ABI and will not load under plain Node.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      electron: path.resolve(__dirname, 'tests/mocks/electron.ts'),
    },
  },
})
