import type Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import {
  Group,
  GroupRow,
  CreateGroupInput,
  UpdateGroupInput,
} from '../types'

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToGroup(row: GroupRow): Group {
  return { ...row }
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class GroupsRepository {
  constructor(private readonly db: Database.Database) {}

  getAll(): Group[] {
    return (this.db.prepare('SELECT * FROM groups ORDER BY position ASC, created_at ASC').all() as GroupRow[])
      .map(rowToGroup)
  }

  getById(id: string): Group | null {
    const row = this.db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as GroupRow | undefined
    return row ? rowToGroup(row) : null
  }

  create(input: CreateGroupInput): Group {
    const id     = uuidv4()
    const now    = new Date().toISOString()
    const maxPos = (this.db.prepare('SELECT COALESCE(MAX(position), -1) as m FROM groups').get() as { m: number }).m

    this.db.prepare(`
      INSERT INTO groups (id, name, color, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.color    ?? '#6366f1',
      input.position ?? maxPos + 1,
      now, now,
    )
    return this.getById(id)!
  }

  update(id: string, input: UpdateGroupInput): Group | null {
    const existing = this.getById(id)
    if (!existing) return null

    this.db.prepare(`
      UPDATE groups SET name = ?, color = ?, position = ?, updated_at = ? WHERE id = ?
    `).run(
      input.name     ?? existing.name,
      input.color    ?? existing.color,
      input.position ?? existing.position,
      new Date().toISOString(),
      id,
    )
    return this.getById(id)
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM groups WHERE id = ?').run(id).changes > 0
  }

  getCounts(): Record<string, number> {
    const rows = this.db.prepare(
      'SELECT group_id, COUNT(*) as count FROM account_groups GROUP BY group_id'
    ).all() as { group_id: string; count: number }[]
    return Object.fromEntries(rows.map(r => [r.group_id, r.count]))
  }

  /** Returns group IDs the account belongs to. */
  getAccountGroups(accountId: string): string[] {
    return (this.db.prepare('SELECT group_id FROM account_groups WHERE account_id = ?')
      .all(accountId) as { group_id: string }[]).map(r => r.group_id)
  }

  addAccounts(groupId: string, accountIds: string[]): number {
    return this.db.transaction(() => {
      const stmt = this.db.prepare('INSERT OR IGNORE INTO account_groups (account_id, group_id) VALUES (?, ?)')
      return accountIds.reduce((n, id) => n + stmt.run(id, groupId).changes, 0)
    })()
  }

  removeAccounts(groupId: string, accountIds: string[]): number {
    return this.db.transaction(() => {
      const stmt = this.db.prepare('DELETE FROM account_groups WHERE account_id = ? AND group_id = ?')
      return accountIds.reduce((n, id) => n + stmt.run(id, groupId).changes, 0)
    })()
  }

  /** Move accounts: remove from all groups, then add to target group (or ungroup if null). */
  moveAccounts(groupId: string | null, accountIds: string[]): number {
    return this.db.transaction(() => {
      const del = this.db.prepare('DELETE FROM account_groups WHERE account_id = ?')
      for (const id of accountIds) del.run(id)

      if (!groupId) return accountIds.length

      const add = this.db.prepare('INSERT OR IGNORE INTO account_groups (account_id, group_id) VALUES (?, ?)')
      return accountIds.reduce((n, id) => n + add.run(id, groupId).changes, 0)
    })()
  }
}
