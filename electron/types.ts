// Re-export shared types so existing imports from './types' keep working
export type {
  AccountStatus,
  SortField,
  SortOrder,
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilters,
  AccountStats,
  TagRule,
  TagRuleTrigger,
  CreateTagRuleInput,
  UpdateTagRuleInput,
  TagRuleRunResult,
} from '../shared/types'

/**
 * Raw DB row — tags stored as JSON string, password encrypted.
 * Only used inside the Electron main process.
 */
export interface AccountRow {
  id: string
  email: string
  password: string  // AES-256-GCM encrypted
  provider: string
  notes: string
  tags: string      // JSON string e.g. '["work","vip"]'
  status: import('../shared/types').AccountStatus
  created_at: string
  updated_at: string
  last_used_at: string | null
}

/** Raw DB row for tag_rules — enabled stored as 0/1 integer */
export interface TagRuleRow {
  id: string
  tag: string
  from_status: import('../shared/types').AccountStatus
  to_status: import('../shared/types').AccountStatus
  trigger: import('../shared/types').TagRuleTrigger
  trigger_value: number
  enabled: number   // 0 | 1
  created_at: string
  updated_at: string
  last_run_at: string | null
}
