import type Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import {
  TagRule,
  TagRuleRow,
  CreateTagRuleInput,
  UpdateTagRuleInput,
  TagRuleRunResult,
} from '../types'
import type { AccountRepository } from './accounts'

// ─── Scheduling helpers ───────────────────────────────────────────────────────

/**
 * Parse a date string from the database into a Date object.
 *
 * SQLite datetime('now') returns strings like "2025-01-01 07:00:00" (no T, no Z).
 * new Date("2025-01-01 07:00:00") is treated as LOCAL time in Node.js, which is
 * wrong — all timestamps are stored as UTC. Appending 'Z' forces UTC parsing.
 *
 * new Date().toISOString() already includes 'Z', so this is safe for both formats.
 */
function parseDbDate(s: string): Date {
  // Already has timezone info (ends with Z or +HH:MM) — parse as-is
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s)
  // SQLite format "YYYY-MM-DD HH:MM:SS" — treat as UTC
  return new Date(s.replace(' ', 'T') + 'Z')
}

/**
 * Returns the most recent past UTC midnight (≤ now) where UTC day-of-month === targetDay.
 * If today IS targetDay in UTC, returns today at UTC 00:00:00.
 *
 * Uses UTC throughout to match how timestamps are stored in the database.
 *
 * Example: now=2025-05-15 UTC, targetDay=1  → 2025-05-01T00:00:00Z
 *          now=2025-05-01 UTC, targetDay=20 → 2025-04-20T00:00:00Z
 */
function lastOccurrenceDayOfMonth(now: Date, targetDay: number): Date {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()

  if (d >= targetDay) {
    return new Date(Date.UTC(y, m, targetDay, 0, 0, 0, 0))
  }

  const prevMonth          = m === 0 ? 11 : m - 1
  const prevYear           = m === 0 ? y - 1 : y
  const lastDayOfPrevMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return new Date(Date.UTC(prevYear, prevMonth, Math.min(targetDay, lastDayOfPrevMonth), 0, 0, 0, 0))
}

/**
 * Returns the most recent past UTC midnight (≤ now) where UTC weekday === targetDow (0=Sun…6=Sat).
 * If today IS targetDow in UTC, returns today at UTC 00:00:00.
 */
function lastOccurrenceDayOfWeek(now: Date, targetDow: number): Date {
  const daysBack = (now.getUTCDay() - targetDow + 7) % 7
  const result   = new Date(now)
  result.setUTCDate(now.getUTCDate() - daysBack)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToTagRule(row: TagRuleRow): TagRule {
  return {
    ...row,
    enabled:     row.enabled === 1,
    filter_type: row.filter_type ?? 'tag',  // guard for rows created before migration
    group_id:    row.group_id ?? null,
  }
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class TagRulesRepository {
  constructor(
    private readonly db: Database.Database,
    private readonly accounts: AccountRepository,
  ) {}

  getAll(): TagRule[] {
    return (this.db.prepare('SELECT * FROM tag_rules ORDER BY created_at ASC').all() as TagRuleRow[])
      .map(rowToTagRule)
  }

  getById(id: string): TagRule | null {
    const row = this.db.prepare('SELECT * FROM tag_rules WHERE id = ?').get(id) as TagRuleRow | undefined
    return row ? rowToTagRule(row) : null
  }

  create(input: CreateTagRuleInput): TagRule {
    const id  = uuidv4()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO tag_rules (id, filter_type, tag, group_id, from_status, to_status, trigger, trigger_value, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.filter_type,
      input.filter_type === 'tag'   ? (input.tag ?? '')      : '',
      input.filter_type === 'group' ? (input.group_id ?? null) : null,
      input.from_status,
      input.to_status,
      input.trigger,
      input.trigger_value,
      input.enabled !== false ? 1 : 0,
      now, now,
    )
    return this.getById(id)!
  }

  update(id: string, input: UpdateTagRuleInput): TagRule | null {
    const existing = this.getById(id)
    if (!existing) return null

    const nextFilterType = input.filter_type ?? existing.filter_type
    const nextTag =
      input.tag !== undefined         ? input.tag
      : nextFilterType === 'tag'      ? existing.tag
      : ''
    const nextGroupId =
      input.group_id !== undefined    ? input.group_id
      : nextFilterType === 'group'    ? existing.group_id
      : null

    const now = new Date().toISOString()
    this.db.prepare(`
      UPDATE tag_rules SET
        filter_type   = ?,
        tag           = ?,
        group_id      = ?,
        from_status   = ?,
        to_status     = ?,
        trigger       = ?,
        trigger_value = ?,
        enabled       = ?,
        updated_at    = ?
      WHERE id = ?
    `).run(
      nextFilterType,
      nextTag,
      nextGroupId,
      input.from_status   ?? existing.from_status,
      input.to_status     ?? existing.to_status,
      input.trigger       ?? existing.trigger,
      input.trigger_value ?? existing.trigger_value,
      input.enabled !== undefined ? (input.enabled ? 1 : 0) : (existing.enabled ? 1 : 0),
      now,
      id,
    )
    return this.getById(id)
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM tag_rules WHERE id = ?').run(id).changes > 0
  }

  /**
   * Same as run() but ignores the period guard — resets last_run_at for all
   * calendar rules before evaluating, so manual "Run now" always fires.
   */
  runForced(): TagRuleRunResult[] {
    // Clear last_run_at for all enabled calendar rules so the period guard
    // doesn't block them.
    this.db.prepare(
      `UPDATE tag_rules SET last_run_at = NULL
       WHERE enabled = 1 AND trigger IN ('day_of_month', 'day_of_week')`
    ).run()
    return this.run()
  }

  /**
   * Evaluate all enabled tag rules and apply status transitions.
   *
   * Catch-up logic: if the app was offline and missed scheduled firings,
   * the rule fires immediately on the next startup.
   *
   * after_days   — fires if account.updated_at is older than N days
   * day_of_month — fires per-account if it was already in the from_status
   *                before the last occurrence of trigger_value day-of-month,
   *                and the rule hasn't already run since that occurrence
   * day_of_week  — same logic but for weekday
   *
   * last_run_at is only stamped when the rule was actually evaluated for the
   * current period. An out-of-window call (e.g. startup before the trigger
   * day in UTC) does NOT write last_run_at, so the firing opportunity is
   * preserved for the next hourly tick.
   */
  run(): TagRuleRunResult[] {
    const rules   = this.getAll().filter(r => r.enabled)
    const results: TagRuleRunResult[] = []
    const now     = new Date()

    for (const rule of rules) {
      const lastRunAt = rule.last_run_at ? parseDbDate(rule.last_run_at) : null

      // For calendar triggers, compute the most recent occurrence and check
      // whether this period has already been evaluated. Skip (without touching
      // last_run_at) if we're still inside the same period.
      let lastOccurrence: Date | null = null
      if (rule.trigger === 'day_of_month') {
        lastOccurrence = lastOccurrenceDayOfMonth(now, rule.trigger_value)
      } else if (rule.trigger === 'day_of_week') {
        lastOccurrence = lastOccurrenceDayOfWeek(now, rule.trigger_value)
      }

      if (lastOccurrence !== null) {
        const notYetRun = lastRunAt === null || lastRunAt < lastOccurrence
        if (!notYetRun) {
          // Already evaluated this period — nothing to do, don't touch last_run_at.
          results.push({ ruleId: rule.id, affected: 0 })
          continue
        }
      }

      const candidates = this.getCandidates(rule.from_status, rule)
      const toUpdate   = this.selectAccountsToUpdate(candidates, rule, now, lastOccurrence)

      let affected = 0
      if (toUpdate.length > 0) {
        affected = this.accounts.bulkUpdateStatus(toUpdate, rule.to_status)
      }

      // Stamp last_run_at only after a genuine evaluation pass for this period.
      this.db.prepare('UPDATE tag_rules SET last_run_at = ? WHERE id = ?')
        .run(now.toISOString(), rule.id)

      results.push({ ruleId: rule.id, affected })
    }

    return results
  }

  private getCandidates(
    fromStatus: string,
    rule: TagRule,
  ): { id: string; updated_at: string }[] {
    if (rule.filter_type === 'tag') {
      // Post-filter in JS — tags are stored as JSON array
      const rows = this.db.prepare(
        'SELECT id, tags, updated_at FROM accounts WHERE status = ?'
      ).all(fromStatus) as { id: string; tags: string; updated_at: string }[]
      return rows.filter(row => {
        try { return (JSON.parse(row.tags) as string[]).includes(rule.tag) }
        catch { return false }
      })
    }

    if (rule.filter_type === 'group' && rule.group_id) {
      return this.db.prepare(
        `SELECT id, updated_at FROM accounts
         WHERE status = ?
           AND id IN (SELECT account_id FROM account_groups WHERE group_id = ?)`
      ).all(fromStatus, rule.group_id) as { id: string; updated_at: string }[]
    }

    // filter_type === 'all'
    return this.db.prepare(
      'SELECT id, updated_at FROM accounts WHERE status = ?'
    ).all(fromStatus) as { id: string; updated_at: string }[]
  }

  private selectAccountsToUpdate(
    candidates: { id: string; updated_at: string }[],
    rule: TagRule,
    now: Date,
    lastOccurrence: Date | null,
  ): string[] {
    const toUpdate: string[] = []

    for (const row of candidates) {
      const updatedAt = parseDbDate(row.updated_at)

      if (rule.trigger === 'after_days') {
        const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays >= rule.trigger_value) toUpdate.push(row.id)
      } else if (lastOccurrence !== null) {
        // Fire only if the account was already in from_status when the trigger day arrived.
        // The notYetRun guard is handled in run() before we reach here.
        if (updatedAt < lastOccurrence) toUpdate.push(row.id)
      }
    }

    return toUpdate
  }
}
