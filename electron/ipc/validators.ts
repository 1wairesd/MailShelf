import { AccountStatus, TagRuleTrigger } from '../types'

// ─── Shared constants ─────────────────────────────────────────────────────────

export const VALID_STATUSES: AccountStatus[] = ['active', 'exhausted', 'waiting-reset', 'dead', 'archived']
export const VALID_TRIGGERS: TagRuleTrigger[] = ['after_days', 'day_of_month', 'day_of_week']

// ─── Shared validators ────────────────────────────────────────────────────────

/** Validate a single string ID. Throws on invalid input. */
export function validId(id: unknown, name = 'id'): string {
  if (typeof id !== 'string' || !id.trim()) throw new Error(`Invalid ${name}`)
  return id
}

/** Validate an array of string IDs. Silently filters out non-strings. */
export function validIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) throw new Error('Invalid ids')
  return ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
}

/** Ensure the database instance is available. */
export function ensureDb<T>(getDb: () => T | null): T {
  const instance = getDb()
  if (!instance) throw new Error('Database not initialized')
  return instance
}
