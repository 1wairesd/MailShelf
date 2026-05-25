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
