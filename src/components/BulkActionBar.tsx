import React from 'react'
import { Trash2, X, CheckSquare, Tag } from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { AccountStatus, STATUS_CONFIG } from '@/types'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { useToast } from './ui/toast'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

export function BulkActionBar() {
  const { selectedIds, accounts, bulkDelete, bulkUpdateStatus, clearSelection, selectAll } = useAccountStore()
  const { toast } = useToast()
  const count = selectedIds.size

  if (count === 0) return null

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    await bulkDelete(ids)
    toast(`Deleted ${ids.length} account${ids.length !== 1 ? 's' : ''}`, 'info')
  }

  const handleStatusChange = async (status: string) => {
    const ids = Array.from(selectedIds)
    await bulkUpdateStatus(ids, status as AccountStatus)
    toast(`Updated ${ids.length} account${ids.length !== 1 ? 's' : ''} to ${STATUS_CONFIG[status as AccountStatus].label}`, 'success')
  }

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2 bg-shelf-accent/10 border-b border-shelf-accent/20',
      'animate-fade-in'
    )}>
      {/* Count */}
      <div className="flex items-center gap-2">
        <CheckSquare size={14} className="text-shelf-accent" />
        <span className="text-sm font-medium text-shelf-accent">
          {count} selected
        </span>
      </div>

      <div className="w-px h-4 bg-shelf-border" />

      {/* Select all */}
      <button
        onClick={selectAll}
        className="text-xs text-shelf-text-muted hover:text-shelf-text transition-colors"
      >
        Select all ({accounts.length})
      </button>

      <div className="flex-1" />

      {/* Change status */}
      <div className="flex items-center gap-1.5">
        <Tag size={13} className="text-shelf-text-muted" />
        <Select
          value=""
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
          placeholder="Set status…"
          className="w-36"
        />
      </div>

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleBulkDelete}
        className="gap-1.5"
      >
        <Trash2 size={13} />
        Delete
      </Button>

      {/* Clear */}
      <button
        onClick={clearSelection}
        className="p-1 rounded text-shelf-text-muted hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
