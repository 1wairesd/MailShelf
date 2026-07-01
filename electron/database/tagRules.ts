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
 * Returns the most recent past Date (≤ now) where day-of-month === targetDay.
 * If today IS targetDay, returns today at 00:00:00.
 *
 * Example: now=2025-05-15, targetDay=1  → 2025-05-01 00:00:00
 *          now=2025-05-01, targetDay=20 → 2025-04-20 00:00:00
 */
function lastOccurrenceDayOfMonth(now: Date, targetDay: number): Date {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  if (d >= targetDay) {
    return new Date(y, m, targetDay, 0, 0, 0, 0)
  }

  const prevMonth          = m === 0 ? 11 : m - 1
  const prevYear           = m === 0 ? y - 1 : y
  const lastDayOfPrevMonth = new Date(y, m, 0).getDate()
  return new Date(prevYear, prevMonth, Math.min(targetDay, lastDayOfPrevMonth), 0, 0, 0, 0)
}

/**
 * Returns the most recent past Date (≤ now) where weekday === targetDow (0=Sun…6=Sat).
 * If today IS targetDow, returns today at 00:00:00.
 */
function lastOccurrenceDayOfWeek(now: Date, targetDow: number): Date {
  const daysBack = (now.getDay() - targetDow + 7) % 7
  const result   = new Date(now)
  result.setDate(now.getDate() - daysBack)
  result.setHours(0, 0, 0, 0)
  return result
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToTagRule(row: TagRuleRow): TagRule {
  return { ...row, enabled: row.enabled === 1 }
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
      INSERT INTO tag_rules (id, tag, from_status, to_status, trigger, trigger_value, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.tag,
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

    const now = new Date().toISOString()
    this.db.prepare(`
      UPDATE tag_rules SET
        tag           = ?,
        from_status   = ?,
        to_status     = ?,
        trigger       = ?,
        trigger_value = ?,
        enabled       = ?,
        updated_at    = ?
      WHERE id = ?
    `).run(
      input.tag           ?? existing.tag,
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
   * Evaluate all enabled tag rules and apply status transitions.
   *
   * Catch-up logic: if the app was offline and missed scheduled firings,
   * the rule fires immediately on the next startup.
   *
   * after_days   — fires if account.updated_at is older than N days
   * day_of_month — fires per-account if it was already in the target status
   *                before the last occurrence of trigger_value day-of-month,
   *                and the rule hasn't already run since that occurrence
   * day_of_week  — same logic but for weekday
   */
  run(): TagRuleRunResult[] {
    const rules   = this.getAll().filter(r => r.enabled)
    const results: TagRuleRunResult[] = []
    const now     = new Date()

    for (const rule of rules) {
      const candidates = this.getCandidates(rule.from_status, rule.tag)
      const lastRunAt  = rule.last_run_at ? new Date(rule.last_run_at) : null
      const toUpdate   = this.selectAccountsToUpdate(candidates, rule, now, lastRunAt)

      let affected = 0
      if (toUpdate.length > 0) {
        affected = this.accounts.bulkUpdateStatus(toUpdate, rule.to_status)
      }

      this.db.prepare('UPDATE tag_rules SET last_run_at = ? WHERE id = ?')
        .run(now.toISOString(), rule.id)

      results.push({ ruleId: rule.id, affected })
    }

    return results
  }

  private getCandidates(
    fromStatus: string,
    tag: string,
  ): { id: string; updated_at: string }[] {
    const rows = this.db.prepare(
      'SELECT id, tags, updated_at FROM accounts WHERE status = ?'
    ).all(fromStatus) as { id: string; tags: string; updated_at: string }[]

    return rows.filter(row => {
      try { return (JSON.parse(row.tags) as string[]).includes(tag) }
      catch { return false }
    })
  }

  private selectAccountsToUpdate(
    candidates: { id: string; updated_at: string }[],
    rule: TagRule,
    now: Date,
    lastRunAt: Date | null,
  ): string[] {
    const toUpdate: string[] = []

    let lastOccurrence: Date | null = null
    if (rule.trigger === 'day_of_month') {
      lastOccurrence = lastOccurrenceDayOfMonth(now, rule.trigger_value)
    } else if (rule.trigger === 'day_of_week') {
      lastOccurrence = lastOccurrenceDayOfWeek(now, rule.trigger_value)
    }

    for (const row of candidates) {
      const updatedAt = new Date(row.updated_at)

      if (rule.trigger === 'after_days') {
        const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays >= rule.trigger_value) toUpdate.push(row.id)
      } else if (lastOccurrence !== null) {
        // Fire only if the account was already waiting when the trigger day arrived,
        // and the rule hasn't already run since that occurrence.
        const wasWaiting      = updatedAt < lastOccurrence
        const notYetRun       = lastRunAt === null || lastRunAt < lastOccurrence
        if (wasWaiting && notYetRun) toUpdate.push(row.id)
      }
    }

    return toUpdate
  }
}
