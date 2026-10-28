import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { migrate, LATEST_SCHEMA_VERSION } from '../../electron/database/migrations'

// Load node:sqlite via createRequire so Vite's module resolver doesn't try to
// bundle the built-in (it otherwise mis-resolves the bare "sqlite" specifier).
// Minimal shape of node:sqlite we use. @types/node 20 doesn't ship these types
// yet (the module is experimental), so we declare just what the tests touch.
interface SqliteStatement {
  all(...params: unknown[]): unknown[]
  get(...params: unknown[]): unknown
  run(...params: unknown[]): unknown
}
interface SqliteDatabase {
  exec(sql: string): void
  prepare(sql: string): SqliteStatement
}
type SqliteDatabaseCtor = new (location: string) => SqliteDatabase

// Silence the "SQLite is an experimental feature" ExperimentalWarning.
const originalEmitWarning = process.emitWarning
process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const name = typeof warning === 'string' ? args[0] : (warning as Error).name
  if (name === 'ExperimentalWarning') return
  return (originalEmitWarning as (...a: unknown[]) => void)(warning, ...args)
}) as typeof process.emitWarning

// Load node:sqlite through a runtime require so Vite's resolver doesn't try to
// bundle the built-in. Vitest runs this module under a CommonJS transform, so
// __filename is defined and usable as the createRequire anchor.
const nodeRequire = createRequire(__filename)
const { DatabaseSync } = nodeRequire('node:sqlite') as { DatabaseSync: SqliteDatabaseCtor }

/**
 * Migration tests run against a REAL SQLite engine via Node's built-in
 * `node:sqlite` (so FTS5, CHECK constraints and PRAGMA user_version all behave
 * authentically) — not the native better-sqlite3 binding, which can't load
 * under plain Node.
 *
 * migrate() uses a small slice of the better-sqlite3 API that node:sqlite does
 * not expose verbatim (`.pragma()` and `.transaction()`), so we wrap the real
 * DatabaseSync in a thin adapter that provides exactly those methods. Every SQL
 * statement and the version bookkeeping still execute against genuine SQLite.
 */
function makeAdapter(db: SqliteDatabase) {
  return {
    exec: (sql: string) => db.exec(sql),
    prepare: (sql: string) => db.prepare(sql),
    pragma: (expr: string, opts?: { simple?: boolean }) => {
      const m = expr.match(/^\s*(\w+)\s*=\s*(.+)$/)
      if (m) {
        // Setter form: "user_version = 2"
        db.exec(`PRAGMA ${expr}`)
        return undefined
      }
      // Getter form: "user_version"
      const row = db.prepare(`PRAGMA ${expr.trim()}`).get() as Record<string, unknown>
      const value = row ? Object.values(row)[0] : undefined
      return opts?.simple ? value : row
    },
    transaction: (fn: () => void) => () => {
      db.exec('BEGIN')
      try {
        fn()
        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
}

function userVersion(db: SqliteDatabase): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  return row.user_version
}

function columns(db: SqliteDatabase, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name)
}

function tableNames(db: SqliteDatabase): string[] {
  return (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[])
    .map(t => t.name)
}

describe('migrate — fresh database', () => {
  it('creates all core tables', () => {
    const db = new DatabaseSync(':memory:')
    migrate(makeAdapter(db) as never)

    const names = tableNames(db)
    expect(names).toContain('accounts')
    expect(names).toContain('tag_rules')
    expect(names).toContain('groups')
    expect(names).toContain('account_groups')
  })

  it('defines tag_rules with filter_type and group_id in the single CREATE (no ALTER needed)', () => {
    const db = new DatabaseSync(':memory:')
    migrate(makeAdapter(db) as never)

    const cols = columns(db, 'tag_rules')
    expect(cols).toContain('filter_type')
    expect(cols).toContain('group_id')
    expect(cols).toContain('last_run_at')
  })

  it('includes archived_at on accounts', () => {
    const db = new DatabaseSync(':memory:')
    migrate(makeAdapter(db) as never)
    expect(columns(db, 'accounts')).toContain('archived_at')
  })

  it('creates the FTS5 mirror table', () => {
    const db = new DatabaseSync(':memory:')
    migrate(makeAdapter(db) as never)
    expect(tableNames(db)).toContain('accounts_fts')
  })

  it('records the latest schema version', () => {
    const db = new DatabaseSync(':memory:')
    migrate(makeAdapter(db) as never)
    expect(userVersion(db)).toBe(LATEST_SCHEMA_VERSION)
  })

  it('enforces the tag_rules.filter_type CHECK constraint', () => {
    const db = new DatabaseSync(':memory:')
    migrate(makeAdapter(db) as never)
    const insertBad = () =>
      db.exec(`INSERT INTO tag_rules (id, filter_type, from_status, to_status, trigger, trigger_value)
               VALUES ('x', 'bogus', 'active', 'dead', 'after_days', 1)`)
    expect(insertBad).toThrow()
  })
})

describe('migrate — idempotency', () => {
  it('is a no-op when run twice and keeps the version stable', () => {
    const db = new DatabaseSync(':memory:')
    migrate(makeAdapter(db) as never)
    const before = tableNames(db).sort()

    expect(() => migrate(makeAdapter(db) as never)).not.toThrow()
    expect(tableNames(db).sort()).toEqual(before)
    expect(userVersion(db)).toBe(LATEST_SCHEMA_VERSION)
  })
})

describe('migrate — upgrade from a pre-versioning (legacy) database', () => {
  // Simulates a real shipped v1.0.x database: tables exist, user_version is 0,
  // and tag_rules was created in the OLD shape WITHOUT filter_type / group_id.
  function seedLegacyDb(): SqliteDatabase {
    const db = new DatabaseSync(':memory:')
    db.exec(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY, email TEXT NOT NULL, password TEXT NOT NULL DEFAULT '',
        provider TEXT NOT NULL DEFAULT 'gmail', notes TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_used_at TEXT
      );
      CREATE TABLE tag_rules (
        id TEXT PRIMARY KEY, tag TEXT NOT NULL, from_status TEXT NOT NULL,
        to_status TEXT NOT NULL, trigger TEXT NOT NULL, trigger_value INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')), last_run_at TEXT
      );
    `)
    // Pre-existing user data must survive the upgrade.
    db.exec(`INSERT INTO accounts (id, email) VALUES ('acc-1', 'legacy@example.com')`)
    db.exec(`INSERT INTO tag_rules (id, tag, from_status, to_status, trigger, trigger_value)
             VALUES ('rule-1', 'vip', 'active', 'dead', 'after_days', 30)`)
    return db
  }

  it('adds the missing columns without touching existing data', () => {
    const db = seedLegacyDb()
    expect(columns(db, 'tag_rules')).not.toContain('filter_type') // precondition
    expect(userVersion(db)).toBe(0)

    migrate(makeAdapter(db) as never)

    expect(columns(db, 'tag_rules')).toContain('filter_type')
    expect(columns(db, 'tag_rules')).toContain('group_id')
    expect(columns(db, 'accounts')).toContain('archived_at')
    expect(userVersion(db)).toBe(LATEST_SCHEMA_VERSION)

    // Existing rows preserved; the migrated column gets its default.
    const acc = db.prepare(`SELECT email FROM accounts WHERE id = 'acc-1'`).get() as { email: string }
    expect(acc.email).toBe('legacy@example.com')
    const rule = db.prepare(`SELECT filter_type FROM tag_rules WHERE id = 'rule-1'`).get() as { filter_type: string }
    expect(rule.filter_type).toBe('tag')
  })
})
