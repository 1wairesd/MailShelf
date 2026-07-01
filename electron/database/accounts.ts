import type Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { encrypt, decrypt } from '../crypto'
import {
  Account,
  AccountRow,
  AccountFilters,
  AccountStats,
  CreateAccountInput,
  UpdateAccountInput,
} from '../types'

const VALID_SORT_FIELDS = ['created_at', 'updated_at', 'status', 'email', 'last_used_at']

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToAccount(row: AccountRow): Account {
  return {
    ...row,
    password: decrypt(row.password) ?? '',
    tags: (() => {
      try { return JSON.parse(row.tags) } catch { return [] }
    })(),
  }
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class AccountRepository {
  constructor(private readonly db: Database.Database) {}

  getAll(filters: AccountFilters = {}): Account[] {
    const {
      search,
      status,
      provider,
      tags,
      groupId,
      sortBy     = 'created_at',
      sortOrder  = 'desc',
    } = filters

    const safeSortBy    = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at'
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

    const conditions: string[] = []
    const params: unknown[]    = []

    if (status && status !== 'all') {
      conditions.push('a.status = ?')
      params.push(status)
    }
    if (provider && provider !== '') {
      conditions.push('a.provider = ?')
      params.push(provider)
    }
    if (groupId) {
      conditions.push('a.id IN (SELECT account_id FROM account_groups WHERE group_id = ?)')
      params.push(groupId)
    }

    let rows: AccountRow[]

    if (search && search.trim()) {
      rows = this.searchAccounts(search, conditions, params, safeSortBy, safeSortOrder)
    } else {
      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
      rows = this.db.prepare(`
        SELECT * FROM accounts a ${where}
        ORDER BY ${safeSortBy} ${safeSortOrder}
      `).all(...params) as AccountRow[]
    }

    let accounts = rows.map(rowToAccount)

    // Tag filter is post-processed since tags are stored as JSON
    if (tags && tags.length > 0) {
      accounts = accounts.filter(a => tags.every(tag => a.tags.includes(tag)))
    }

    return accounts
  }

  private searchAccounts(
    search: string,
    conditions: string[],
    params: unknown[],
    sortBy: string,
    sortOrder: string,
  ): AccountRow[] {
    const tokens   = search.trim().split(/\s+/).filter(Boolean)
    const ftsQuery = tokens.map(t => `"${t.replace(/["*^()]/g, '')}"*`).join(' OR ')
    const whereClause = conditions.length ? 'AND ' + conditions.join(' AND ') : ''

    let rows: AccountRow[] = []
    try {
      rows = this.db.prepare(`
        SELECT a.* FROM accounts a
        INNER JOIN accounts_fts fts ON a.id = fts.id
        WHERE accounts_fts MATCH ? ${whereClause}
        ORDER BY a.${sortBy} ${sortOrder}
      `).all(ftsQuery, ...params) as AccountRow[]
    } catch {
      // FTS query failed (e.g. special chars) — fall through to LIKE
    }

    if (rows.length === 0) {
      const likePattern    = `%${search.trim().replace(/[%_]/g, '\\$&')}%`
      const likeConditions = [
        ...conditions,
        `(a.email LIKE ? ESCAPE '\\' OR a.notes LIKE ? ESCAPE '\\' OR a.tags LIKE ? ESCAPE '\\')`,
      ]
      rows = this.db.prepare(`
        SELECT * FROM accounts a
        WHERE ${likeConditions.join(' AND ')}
        ORDER BY ${sortBy} ${sortOrder}
      `).all(...params, likePattern, likePattern, likePattern) as AccountRow[]
    }

    return rows
  }

  getById(id: string): Account | null {
    const row = this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined
    return row ? rowToAccount(row) : null
  }

  create(input: CreateAccountInput): Account {
    const id  = uuidv4()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO accounts (id, email, password, provider, notes, tags, status, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.email,
      encrypt(input.password ?? '') ?? null,
      input.provider ?? 'gmail',
      input.notes    ?? '',
      JSON.stringify(input.tags ?? []),
      input.status   ?? 'active',
      now, now, null,
    )
    return this.getById(id)!
  }

  update(id: string, input: UpdateAccountInput): Account | null {
    const existing = this.getById(id)
    if (!existing) return null

    const now      = new Date().toISOString()
    const newStatus = input.status ?? existing.status

    let archivedAt: string | null
    if (input.archived_at !== undefined) {
      archivedAt = input.archived_at
    } else if (newStatus === 'archived' && existing.status !== 'archived') {
      archivedAt = now
    } else if (newStatus !== 'archived' && existing.status === 'archived') {
      archivedAt = null
    } else {
      archivedAt = existing.archived_at
    }

    this.db.prepare(`
      UPDATE accounts SET
        email        = ?,
        password     = ?,
        provider     = ?,
        notes        = ?,
        tags         = ?,
        status       = ?,
        updated_at   = ?,
        last_used_at = ?,
        archived_at  = ?
      WHERE id = ?
    `).run(
      input.email    ?? existing.email,
      encrypt(input.password !== undefined ? input.password : existing.password) ?? null,
      input.provider ?? existing.provider,
      input.notes    ?? existing.notes,
      JSON.stringify(input.tags !== undefined ? input.tags : existing.tags),
      newStatus,
      now,
      input.last_used_at !== undefined ? input.last_used_at : existing.last_used_at,
      archivedAt,
      id,
    )
    return this.getById(id)
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id).changes > 0
  }

  bulkDelete(ids: string[]): number {
    return this.db.transaction(() => {
      const stmt = this.db.prepare('DELETE FROM accounts WHERE id = ?')
      return ids.reduce((n, id) => n + stmt.run(id).changes, 0)
    })()
  }

  bulkUpdateStatus(ids: string[], status: string): number {
    return this.db.transaction(() => {
      const now  = new Date().toISOString()
      const stmt = this.db.prepare('UPDATE accounts SET status = ?, updated_at = ? WHERE id = ?')
      return ids.reduce((n, id) => n + stmt.run(status, now, id).changes, 0)
    })()
  }

  /**
   * Add or remove a tag from multiple accounts atomically.
   * mode='add'    — appends tag if not already present
   * mode='remove' — removes tag if present
   */
  bulkUpdateTag(ids: string[], tag: string, mode: 'add' | 'remove'): number {
    return this.db.transaction(() => {
      const now    = new Date().toISOString()
      const select = this.db.prepare('SELECT id, tags FROM accounts WHERE id = ?')
      const update = this.db.prepare('UPDATE accounts SET tags = ?, updated_at = ? WHERE id = ?')
      let count = 0

      for (const id of ids) {
        const row = select.get(id) as { id: string; tags: string } | undefined
        if (!row) continue

        let tags: string[] = []
        try { tags = JSON.parse(row.tags) } catch { tags = [] }

        let next = tags
        if (mode === 'add' && !tags.includes(tag)) {
          next = [...tags, tag]
        } else if (mode === 'remove') {
          next = tags.filter(t => t !== tag)
        }

        if (next !== tags) {
          update.run(JSON.stringify(next), now, id)
          count++
        }
      }
      return count
    })()
  }

  getStats(): AccountStats {
    const rows  = this.db.prepare('SELECT status, COUNT(*) as count FROM accounts GROUP BY status').all() as { status: string; count: number }[]
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number }).count

    const stats: AccountStats = { total, active: 0, exhausted: 0, 'waiting-reset': 0, dead: 0, archived: 0 }
    for (const row of rows) {
      if (row.status in stats) (stats as unknown as Record<string, number>)[row.status] = row.count
    }
    return stats
  }

  getAllTags(): string[] {
    const rows = this.db.prepare('SELECT tags FROM accounts').all() as { tags: string }[]
    const set  = new Set<string>()
    for (const row of rows) {
      try { (JSON.parse(row.tags) as string[]).forEach(t => set.add(t)) } catch { /* skip */ }
    }
    return Array.from(set).sort()
  }

  getTagCounts(): Record<string, number> {
    const rows   = this.db.prepare('SELECT tags FROM accounts').all() as { tags: string }[]
    const counts: Record<string, number> = {}
    for (const row of rows) {
      try {
        for (const tag of JSON.parse(row.tags) as string[]) {
          counts[tag] = (counts[tag] ?? 0) + 1
        }
      } catch { /* skip */ }
    }
    return counts
  }

  exportAll(): Account[] {
    return (this.db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as AccountRow[]).map(rowToAccount)
  }

  exportCSV(): string {
    const accounts = this.exportAll()
    const headers  = ['id', 'email', 'password', 'provider', 'status', 'tags', 'notes', 'created_at', 'updated_at', 'last_used_at', 'archived_at']
    const escape   = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const rows = accounts.map(a =>
      [a.id, a.email, a.password, a.provider, a.status, a.tags.join(';'), a.notes,
       a.created_at, a.updated_at, a.last_used_at ?? '', a.archived_at ?? ''].map(escape).join(',')
    )
    return [headers.join(','), ...rows].join('\n')
  }

  import(accounts: CreateAccountInput[]): number {
    return this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO accounts
          (id, email, password, provider, notes, tags, status, created_at, updated_at, last_used_at, archived_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const a of accounts) {
        const now = new Date().toISOString()
        stmt.run(
          uuidv4(), // always generate fresh id — never trust import source
          a.email    ?? '',
          encrypt(a.password ?? '') ?? null,
          a.provider ?? 'gmail',
          a.notes    ?? '',
          JSON.stringify(Array.isArray(a.tags) ? a.tags : []),
          a.status   ?? 'active',
          now, now, null, null,
        )
      }
      return accounts.length
    })()
  }
}
