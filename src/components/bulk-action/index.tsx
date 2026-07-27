import React from 'react'
import { Trash2, X, CheckSquare } from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { useGroupsStore } from '@/store/groupsStore'
import { AccountStatus, STATUS_CONFIG } from '@/types'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { SelectMenu } from './SelectMenu'
import { TagBulkMenu } from './TagBulkMenu'
import { GroupBulkMenu } from './GroupBulkMenu'

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  dotColor: cfg.dotColor,
}))

export function BulkActionBar() {
  const selectedIds = useAccountStore(s => s.selectedIds)
  const accounts    = useAccountStore(s => s.accounts)
  const allTags     = useAccountStore(s => s.allTags)

  const {
    bulkDelete, bulkUpdateStatus, bulkUpdateTag,
    clearSelection, selectAll,
    selectByTag, selectByStatus, selectByProvider,
    showConfirm,
  } = useAccountStore.getState()

  const { moveAccountsToGroup, loadGroupCounts } = useGroupsStore.getState()
  const groupsList = useGroupsStore(s => s.groups)
  const { toast } = useToast()

  const count = selectedIds.size
  const ids = Array.from(selectedIds)

  const selectedAccounts = React.useMemo(
    () => accounts.filter(a => selectedIds.has(a.id)),
    [accounts, selectedIds]
  )

  const tagState = React.useCallback((tag: string): 'all' | 'some' | 'none' => {
    const withTag = selectedAccounts.filter(a => a.tags.includes(tag)).length
    if (withTag === 0) return 'none'
    if (withTag === selectedAccounts.length) return 'all'
    return 'some'
  }, [selectedAccounts])

  const providers = React.useMemo(
    () => Array.from(new Set(accounts.map(a => a.provider))).sort(),
    [accounts]
  )

  if (count === 0) return null

  const plural = (n: number, noun: string) => `${n} ${noun}${n !== 1 ? 's' : ''}`

  const handleBulkDelete = () => {
    showConfirm({
      title: `Delete ${plural(ids.length, 'account')}?`,
      description: `This will permanently delete ${plural(ids.length, 'selected account')}. This action cannot be undone.`,
      confirmLabel: `Delete ${ids.length}`,
      onConfirm: async () => {
        await bulkDelete(ids)
        toast(`Deleted ${plural(ids.length, 'account')}`, 'info')
      },
    })
  }

  const handleStatusChange = async (status: string) => {
    await bulkUpdateStatus(ids, status as AccountStatus)
    toast(`Updated ${plural(ids.length, 'account')} → ${STATUS_CONFIG[status as AccountStatus].label}`, 'success')
  }

  const handleTagAdd = async (tag: string) => {
    await bulkUpdateTag(ids, tag, 'add')
    toast(`Added tag "${tag}" to ${plural(ids.length, 'account')}`, 'success')
  }

  const handleTagRemove = async (tag: string) => {
    await bulkUpdateTag(ids, tag, 'remove')
    toast(`Removed tag "${tag}" from ${plural(ids.length, 'account')}`, 'info')
  }

  const handleMoveToGroup = async (groupId: string | null) => {
    await moveAccountsToGroup(groupId, ids)
    await loadGroupCounts()
    useAccountStore.getState().loadAccounts()
    const label = groupId
      ? `"${groupsList.find(g => g.id === groupId)?.name ?? groupId}"`
      : 'ungrouped'
    toast(`Moved ${plural(ids.length, 'account')} to ${label}`, 'success')
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 bg-shelf-accent/10 border-b border-shelf-accent/20',
      'animate-fade-in'
    )}>
      {/* Count badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CheckSquare size={13} className="text-shelf-accent" />
        <span className="text-xs font-semibold text-shelf-accent tabular-nums">{count}</span>
      </div>

      <Divider />

      <SelectMenu
        accounts={accounts}
        allTags={allTags}
        providers={providers}
        totalCount={accounts.length}
        onSelectAll={selectAll}
        onSelectByTag={selectByTag}
        onSelectByStatus={selectByStatus}
        onSelectByProvider={selectByProvider}
      />

      <div className="flex-1" />

      <TagBulkMenu allTags={allTags} tagState={tagState} onAdd={handleTagAdd} onRemove={handleTagRemove} />

      <Divider />

      {groupsList.length > 0 && (
        <>
          <GroupBulkMenu groups={groupsList} onMove={handleMoveToGroup} />
          <Divider />
        </>
      )}

      <Select
        value=""
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
        placeholder="Set status…"
        className="w-32"
      />

      <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-1.5 shrink-0">
        <Trash2 size={12} />
        Delete
      </Button>

      <button
        onClick={clearSelection}
        className="p-1 rounded text-shelf-text-muted hover:text-shelf-text hover:bg-shelf-elevated transition-colors shrink-0"
        title="Clear selection"
      >
        <X size={13} />
      </button>
    </div>
  )
}

function Divider() {
  return <div className="w-px h-3.5 bg-shelf-border shrink-0" />
}
