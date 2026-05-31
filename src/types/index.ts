// Re-export shared types so existing imports from '@/types' keep working
export type {
  AccountStatus,
  SortField,
  SortOrder,
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilters,
  AccountStats,
} from '@shared/types'

// ─── Frontend-only types ─────────────────────────────────────────────────────

export interface ImportExportResult {
  success: boolean
  count?: number
  error?: string
}

export const STATUS_CONFIG: Record<import('@shared/types').AccountStatus, {
  label: string
  color: string
  bgColor: string
  dotColor: string
}> = {
  active: {
    label: 'Active',
    color: 'text-green-400 status-active',
    bgColor: 'bg-green-400/10',
    dotColor: 'bg-green-400',
  },
  exhausted: {
    label: 'Exhausted',
    color: 'text-orange-400 status-exhausted',
    bgColor: 'bg-orange-400/10',
    dotColor: 'bg-orange-400',
  },
  'waiting-reset': {
    label: 'Waiting Reset',
    color: 'text-yellow-400 status-waiting-reset',
    bgColor: 'bg-yellow-400/10',
    dotColor: 'bg-yellow-400',
  },
  dead: {
    label: 'Dead',
    color: 'text-red-400 status-dead',
    bgColor: 'bg-red-400/10',
    dotColor: 'bg-red-400',
  },
  archived: {
    label: 'Archived',
    color: 'text-zinc-500 status-archived',
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
