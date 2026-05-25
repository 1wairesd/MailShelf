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
