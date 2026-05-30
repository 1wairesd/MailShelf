/**
 * Shared types used by both the Electron main process (electron/)
 * and the React renderer (src/).
 *
 * Keep this file free of any platform-specific imports.
 */

export type AccountStatus =
  | 'active'
  | 'exhausted'
  | 'waiting-reset'
  | 'dead'
  | 'archived'

export type SortField = 'created_at' | 'updated_at' | 'status' | 'email' | 'last_used_at'
export type SortOrder = 'asc' | 'desc'

export interface Account {
  id: string
  email: string
  password: string
  provider: string
  notes: string
  tags: string[]
  status: AccountStatus
  created_at: string
  updated_at: string
  last_used_at: string | null
  archived_at: string | null
}

export interface CreateAccountInput {
  email: string
  password: string
  provider?: string
  notes?: string
  tags?: string[]
  status?: AccountStatus
}

export interface UpdateAccountInput {
  email?: string
  password?: string
  provider?: string
  notes?: string
  tags?: string[]
  status?: AccountStatus
  last_used_at?: string | null
  archived_at?: string | null
}

export interface AccountFilters {
  search?: string
  status?: AccountStatus | 'all'
  provider?: string
  tags?: string[]
  sortBy?: SortField
  sortOrder?: SortOrder
}

export interface AccountStats {
  total: number
  active: number
  exhausted: number
  'waiting-reset': number
  dead: number
  archived: number
}

// ─── Tag Rules ────────────────────────────────────────────────────────────────

/**
 * How the rule triggers:
 * - 'after_days'   — N days after the account's status was last changed
 * - 'day_of_month' — on a specific day of each month (1–28)
 * - 'day_of_week'  — on a specific weekday (0=Sun … 6=Sat)
 */
export type TagRuleTrigger = 'after_days' | 'day_of_month' | 'day_of_week'

export interface TagRule {
  id: string
  /** The tag this rule applies to (e.g. "waiting-reset") */
  tag: string
  /** Only accounts with this status are eligible */
  from_status: AccountStatus
  /** Status to transition to when the rule fires */
  to_status: AccountStatus
  trigger: TagRuleTrigger
  /** after_days: number of days; day_of_month: 1–28; day_of_week: 0–6 */
  trigger_value: number
  enabled: boolean
  created_at: string
  updated_at: string
  /** ISO timestamp of the last time this rule was evaluated */
  last_run_at: string | null
}

export interface CreateTagRuleInput {
  tag: string
  from_status: AccountStatus
  to_status: AccountStatus
  trigger: TagRuleTrigger
  trigger_value: number
  enabled?: boolean
}

export interface UpdateTagRuleInput {
  tag?: string
  from_status?: AccountStatus
  to_status?: AccountStatus
  trigger?: TagRuleTrigger
  trigger_value?: number
  enabled?: boolean
}

export interface TagRuleRunResult {
  ruleId: string
  affected: number
}
