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

export interface ImportExportResult {
  success: boolean
  count?: number
  error?: string
}

export const STATUS_CONFIG: Record<AccountStatus, {
  label: string
  color: string
  bgColor: string
  dotColor: string
}> = {
  active: {
    label: 'Active',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    dotColor: 'bg-green-400',
  },
  exhausted: {
    label: 'Exhausted',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    dotColor: 'bg-orange-400',
  },
  'waiting-reset': {
    label: 'Waiting Reset',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    dotColor: 'bg-yellow-400',
  },
  dead: {
    label: 'Dead',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    dotColor: 'bg-red-400',
  },
  archived: {
    label: 'Archived',
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500/10',
    dotColor: 'bg-zinc-500',
  },
}

export const PROVIDER_OPTIONS = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'yahoo', label: 'Yahoo' },
  { value: 'proton', label: 'ProtonMail' },
  { value: 'icloud', label: 'iCloud' },
  { value: 'custom', label: 'Custom' },
]
