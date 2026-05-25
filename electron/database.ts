import Database from 'better-sqlite3'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { encrypt, decrypt } from './crypto'
import {
  Account,
  AccountRow,
  AccountFilters,
  AccountStats,
  CreateAccountInput,
  UpdateAccountInput,
} from './types'

export class DatabaseService {
  private db: Database.Database

  constructor(userDataPath: string) {
    const dbPath = path.join(userDataPath, 'mailshelf.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('synchronous = NORMAL')
    this.migrate()
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id          TEXT PRIMARY KEY,
        email       TEXT NOT NULL,
        password    TEXT NOT NULL DEFAULT '',
        provider    TEXT NOT NULL DEFAULT 'gmail',
        notes       TEXT NOT NULL DEFAULT '',
        tags        TEXT NOT NULL DEFAULT '[]',
        status      TEXT NOT NULL DEFAULT 'active'
                    CHECK(status IN ('active','exhausted','waiting-reset','dead','archived')),
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        last_used_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
      CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
      CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at);
      CREATE INDEX IF NOT EXISTS idx_accounts_updated_at ON accounts(updated_at);

      CREATE VIRTUAL TABLE IF NOT EXISTS accounts_fts USING fts5(
        id UNINDEXED,
        email,
        notes,
        tags,
        content='accounts',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS accounts_ai AFTER INSERT ON accounts BEGIN
        INSERT INTO accounts_fts(rowid, id, email, notes, tags)
        VALUES (new.rowid, new.id, new.email, new.notes, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS accounts_ad AFTER DELETE ON accounts BEGIN
        INSERT INTO accounts_fts(accounts_fts, rowid, id, email, notes, tags)
        VALUES ('delete', old.rowid, old.id, old.email, old.notes, old.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS accounts_au AFTER UPDATE ON accounts BEGIN
        INSERT INTO accounts_fts(accounts_fts, rowid, id, email, notes, tags)
        VALUES ('delete', old.rowid, old.id, old.email, old.notes, old.tags);
        INSERT INTO accounts_fts(rowid, id, email, notes, tags)
        VALUES (new.rowid, new.id, new.email, new.notes, new.tags);
      END;
    `)
  }

  private rowToAccount(row: AccountRow): Account {
    return {
      ...row,
      password: decrypt(row.password),   // decrypt on read
      tags: (() => {
        try {
          return JSON.parse(row.tags)
        } catch {
          return []
        }
      })(),
    }
  }

  getAccounts(filters: AccountFilters = {}): Account[] {
    const {
      search,
      status,
      provider,
      tags,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters

    const validSortFields = ['created_at', 'updated_at', 'status', 'email', 'last_used_at']
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

    // Build WHERE clauses dynamically
    const conditions: string[] = []
    const params: unknown[] = []

    if (status && status !== 'all') {
      conditions.push('a.status = ?')
      params.push(status)
    }
    if (provider && provider !== '') {
      conditions.push('a.provider = ?')
      params.push(provider)
    }

    let rows: AccountRow[]

    if (search && search.trim()) {
      // Build FTS5 query with prefix matching (* suffix) so partial input works.
      // Each token becomes  "token"*  which matches any word starting with that token.
      // Special chars that break FTS5 syntax are stripped.
      const tokens = search.trim().split(/\s+/).filter(Boolean)
      const ftsQuery = tokens
        .map(t => `"${t.replace(/["*^()]/g, '')}"*`)
        .join(' OR ')

      const whereClause = conditions.length ? 'AND ' + conditions.join(' AND ') : ''

      let rows_: AccountRow[] = []

      try {
        const stmt = this.db.prepare(`
          SELECT a.* FROM accounts a
          INNER JOIN accounts_fts fts ON a.id = fts.id
          WHERE accounts_fts MATCH ? ${whereClause}
          ORDER BY a.${safeSortBy} ${safeSortOrder}
        `)
        rows_ = stmt.all(ftsQuery, ...params) as AccountRow[]
      } catch {
        // FTS query failed (e.g. special chars) — fall through to LIKE
        rows_ = []
      }

      // If FTS returned nothing, fall back to LIKE so mid-word search works too
      // (e.g. searching "mail" finds "gmail.com")
      if (rows_.length === 0) {
        const likePattern = `%${search.trim().replace(/[%_]/g, '\\$&')}%`
        const likeConditions = [
          ...conditions,
          `(a.email LIKE ? ESCAPE '\\' OR a.notes LIKE ? ESCAPE '\\' OR a.tags LIKE ? ESCAPE '\\')`,
        ]
        const likeStmt = this.db.prepare(`
          SELECT * FROM accounts a
          WHERE ${likeConditions.join(' AND ')}
          ORDER BY ${safeSortBy} ${safeSortOrder}
        `)
        rows_ = likeStmt.all(...params, likePattern, likePattern, likePattern) as AccountRow[]
      }

      rows = rows_
    } else {
      const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
      const stmt = this.db.prepare(`
        SELECT * FROM accounts a ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
      `)
      rows = stmt.all(...params) as AccountRow[]
    }

    let accounts = rows.map(r => this.rowToAccount(r))

    // Filter by tags (post-process since tags are JSON)
    if (tags && tags.length > 0) {
      accounts = accounts.filter(a =>
        tags.every(tag => a.tags.includes(tag))
      )
    }

    return accounts
  }

  getAccountById(id: string): Account | null {
    const row = this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined
    return row ? this.rowToAccount(row) : null
  }

  createAccount(input: CreateAccountInput): Account {
    const id = uuidv4()
    const now = new Date().toISOString()
    const tags = JSON.stringify(input.tags ?? [])
    const encryptedPassword = encrypt(input.password ?? '')

    this.db.prepare(`
      INSERT INTO accounts (id, email, password, provider, notes, tags, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.email,
      encryptedPassword,
      input.provider ?? 'gmail',
      input.notes ?? '',
      tags,
      input.status ?? 'active',
      now,
      now,
    )

    return this.getAccountById(id)!
  }

  updateAccount(id: string, input: UpdateAccountInput): Account | null {
    const existing = this.getAccountById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const tags = input.tags !== undefined ? JSON.stringify(input.tags) : JSON.stringify(existing.tags)
    // Re-encrypt if password changed, otherwise re-encrypt existing (already decrypted in existing)
    const newPassword = input.password !== undefined ? input.password : existing.password
    const encryptedPassword = encrypt(newPassword)

    this.db.prepare(`
      UPDATE accounts SET
        email        = ?,
        password     = ?,
        provider     = ?,
        notes        = ?,
        tags         = ?,
        status       = ?,
        updated_at   = ?,
        last_used_at = ?
      WHERE id = ?
    `).run(
      input.email ?? existing.email,
      encryptedPassword,
      input.provider ?? existing.provider,
      input.notes ?? existing.notes,
      tags,
      input.status ?? existing.status,
      now,
      input.last_used_at !== undefined ? input.last_used_at : existing.last_used_at,
      id,
    )

    return this.getAccountById(id)
  }

  deleteAccount(id: string): boolean {
    const result = this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
    return result.changes > 0
  }

  bulkDeleteAccounts(ids: string[]): number {
    const deleteMany = this.db.transaction((ids: string[]) => {
      let count = 0
      const stmt = this.db.prepare('DELETE FROM accounts WHERE id = ?')
      for (const id of ids) {
        count += stmt.run(id).changes
      }
      return count
    })
    return deleteMany(ids)
  }

  bulkUpdateStatus(ids: string[], status: string): number {
    const updateMany = this.db.transaction((ids: string[], status: string) => {
      let count = 0
      const now = new Date().toISOString()
      const stmt = this.db.prepare('UPDATE accounts SET status = ?, updated_at = ? WHERE id = ?')
      for (const id of ids) {
        count += stmt.run(status, now, id).changes
      }
      return count
    })
    return updateMany(ids, status)
  }

  /**
   * Add or remove a tag from multiple accounts atomically.
   * mode='add'    — appends tag if not already present
   * mode='remove' — removes tag if present
   */
  bulkUpdateTag(ids: string[], tag: string, mode: 'add' | 'remove'): number {
    const update = this.db.transaction((ids: string[], tag: string, mode: 'add' | 'remove') => {
      let count = 0
      const now = new Date().toISOString()
      const selectStmt = this.db.prepare('SELECT id, tags FROM accounts WHERE id = ?')
      const updateStmt = this.db.prepare('UPDATE accounts SET tags = ?, updated_at = ? WHERE id = ?')

      for (const id of ids) {
        const row = selectStmt.get(id) as { id: string; tags: string } | undefined
        if (!row) continue

        let tags: string[] = []
        try { tags = JSON.parse(row.tags) } catch { tags = [] }

        let changed = false
        if (mode === 'add' && !tags.includes(tag)) {
          tags = [...tags, tag]
          changed = true
        } else if (mode === 'remove') {
          const next = tags.filter(t => t !== tag)
          if (next.length !== tags.length) {
            tags = next
            changed = true
          }
        }

        if (changed) {
          updateStmt.run(JSON.stringify(tags), now, id)
          count++
        }
      }
      return count
    })
    return update(ids, tag, mode)
  }

  getStats(): AccountStats {
    const rows = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM accounts GROUP BY status
    `).all() as { status: string; count: number }[]

    const total = (this.db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number }).count

    const stats: AccountStats = {
      total,
      active: 0,
      exhausted: 0,
      'waiting-reset': 0,
      dead: 0,
      archived: 0,
    }

    for (const row of rows) {
      if (row.status in stats) {
        (stats as unknown as Record<string, number>)[row.status] = row.count
      }
    }

    return stats
  }

  getAllTags(): string[] {
    const rows = this.db.prepare('SELECT tags FROM accounts').all() as { tags: string }[]
    const tagSet = new Set<string>()
    for (const row of rows) {
      try {
        const tags = JSON.parse(row.tags) as string[]
        tags.forEach(t => tagSet.add(t))
      } catch {
        // ignore
      }
    }
    return Array.from(tagSet).sort()
  }

  exportAccounts(): Account[] {
    const rows = this.db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as AccountRow[]
    return rows.map(r => this.rowToAccount(r))
  }

  importAccounts(accounts: Account[]): number {
    const importMany = this.db.transaction((accounts: Account[]) => {
      let count = 0
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO accounts
          (id, email, password, provider, notes, tags, status, created_at, updated_at, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const a of accounts) {
        const id = a.id || uuidv4()
        const tags = Array.isArray(a.tags) ? JSON.stringify(a.tags) : (a.tags ?? '[]')
        // Encrypt password on import (may be plaintext from export)
        const encryptedPassword = encrypt(a.password ?? '')
        stmt.run(
          id,
          a.email ?? '',
          encryptedPassword,
          a.provider ?? 'gmail',
          a.notes ?? '',
          tags,
          a.status ?? 'active',
          a.created_at ?? new Date().toISOString(),
          a.updated_at ?? new Date().toISOString(),
          a.last_used_at ?? null,
        )
        count++
      }
      return count
    })
    return importMany(accounts)
  }

  close() {
    this.db.close()
  }
}
