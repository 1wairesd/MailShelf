import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Trash2, X, CheckSquare, Tag, Plus, Minus, ChevronDown,
  Folder, ListFilter, Hash, Activity, Globe,
} from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { useGroupsStore } from '@/store/groupsStore'
import { AccountStatus, STATUS_CONFIG, PROVIDER_OPTIONS } from '@/types'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { TagBadge } from './TagBadge'
import { useToast } from './ui/toast'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  dotColor: cfg.dotColor,
}))

export function BulkActionBar() {
  const {
    selectedIds, accounts, allTags,
    bulkDelete, bulkUpdateStatus, bulkUpdateTag,
    clearSelection, selectAll,
    selectByTag, selectByStatus, selectByProvider,
    showConfirm,
  } = useAccountStore()
  const { groups, moveAccountsToGroup, loadGroupCounts } = useGroupsStore()
  const { toast } = useToast()
  const count = selectedIds.size

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

  // Unique providers in current list
  const providers = React.useMemo(() => {
    const set = new Set(accounts.map(a => a.provider))
    return Array.from(set).sort()
  }, [accounts])

  if (count === 0) return null

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds)
    showConfirm({
      title: `Delete ${ids.length} account${ids.length !== 1 ? 's' : ''}?`,
      description: `This will permanently delete ${ids.length} selected account${ids.length !== 1 ? 's' : ''}. This action cannot be undone.`,
      confirmLabel: `Delete ${ids.length}`,
      onConfirm: async () => {
        await bulkDelete(ids)
        toast(`Deleted ${ids.length} account${ids.length !== 1 ? 's' : ''}`, 'info')
      },
    })
  }

  const handleStatusChange = async (status: string) => {
    const ids = Array.from(selectedIds)
    await bulkUpdateStatus(ids, status as AccountStatus)
    toast(`Updated ${ids.length} account${ids.length !== 1 ? 's' : ''} → ${STATUS_CONFIG[status as AccountStatus].label}`, 'success')
  }

  const handleTagAdd = async (tag: string) => {
    const ids = Array.from(selectedIds)
    await bulkUpdateTag(ids, tag, 'add')
    toast(`Added tag "${tag}" to ${ids.length} account${ids.length !== 1 ? 's' : ''}`, 'success')
  }

  const handleTagRemove = async (tag: string) => {
    const ids = Array.from(selectedIds)
    await bulkUpdateTag(ids, tag, 'remove')
    toast(`Removed tag "${tag}" from ${ids.length} account${ids.length !== 1 ? 's' : ''}`, 'info')
  }

  const handleMoveToGroup = async (groupId: string | null) => {
    const ids = Array.from(selectedIds)
    await moveAccountsToGroup(groupId, ids)
    await loadGroupCounts()
    useAccountStore.getState().loadAccounts()
    const label = groupId
      ? `"${groups.find(g => g.id === groupId)?.name ?? groupId}"`
      : 'ungrouped'
    toast(`Moved ${ids.length} account${ids.length !== 1 ? 's' : ''} to ${label}`, 'success')
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 bg-shelf-accent/10 border-b border-shelf-accent/20',
      'animate-fade-in'
    )}>
      {/* Count badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CheckSquare size={13} className="text-shelf-accent" />
        <span className="text-xs font-semibold text-shelf-accent tabular-nums">
          {count}
        </span>
      </div>

      <div className="w-px h-4 bg-shelf-border shrink-0" />

      {/* Smart select menu */}
      <SelectMenu
        accounts={accounts}
        allTags={allTags}
        providers={providers}
        onSelectAll={selectAll}
        onSelectByTag={selectByTag}
        onSelectByStatus={selectByStatus}
        onSelectByProvider={selectByProvider}
        totalCount={accounts.length}
      />

      <div className="flex-1" />

      {/* Tag management */}
      <TagBulkMenu
        allTags={allTags}
        tagState={tagState}
        onAdd={handleTagAdd}
        onRemove={handleTagRemove}
      />

      <div className="w-px h-3.5 bg-shelf-border shrink-0" />

      {/* Move to group */}
      {groups.length > 0 && (
        <>
          <GroupBulkMenu groups={groups} onMove={handleMoveToGroup} />
          <div className="w-px h-3.5 bg-shelf-border shrink-0" />
        </>
      )}

      {/* Set status */}
      <Select
        value=""
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
        placeholder="Set status…"
        className="w-32"
      />

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleBulkDelete}
        className="gap-1.5 shrink-0"
      >
        <Trash2 size={12} />
        Delete
      </Button>

      {/* Clear selection */}
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

// ─── Smart Select menu ────────────────────────────────────────────────────────

interface SelectMenuProps {
  accounts: import('@/types').Account[]
  allTags: string[]
  providers: string[]
  totalCount: number
  onSelectAll: () => void
  onSelectByTag: (tag: string) => void
  onSelectByStatus: (status: AccountStatus) => void
  onSelectByProvider: (provider: string) => void
}

function SelectMenu({
  allTags, providers, totalCount,
  onSelectAll, onSelectByTag, onSelectByStatus, onSelectByProvider,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!open) return
    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById('select-menu-portal')
      if (triggerRef.current?.contains(e.target as Node) || portal?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const providerLabel = (p: string) =>
    PROVIDER_OPTIONS.find(o => o.value === p)?.label ?? p

  const dropdownContent = (
    <div
      id="select-menu-portal"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(rect ? { left: rect.left, top: rect.bottom + 4, minWidth: 220 } : { display: 'none' }),
      }}
    >
      <div className="rounded-md border border-shelf-border bg-shelf-surface shadow-lg overflow-hidden py-1">

        {/* Select all */}
        <button
          onMouseDown={e => { e.preventDefault(); onSelectAll(); setOpen(false) }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
        >
          <CheckSquare size={13} className="shrink-0 text-shelf-accent" />
          <span>Select all</span>
          <span className="ml-auto text-[10px] text-shelf-text-subtle tabular-nums">{totalCount}</span>
        </button>

        {/* By status */}
        {STATUS_OPTIONS.length > 0 && (
          <>
            <div className="px-3 py-1 mt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle flex items-center gap-1.5">
                <Activity size={9} />
                By status
              </p>
            </div>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onMouseDown={e => { e.preventDefault(); onSelectByStatus(s.value as AccountStatus); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', s.dotColor)} />
                <span>{s.label}</span>
              </button>
            ))}
          </>
        )}

        {/* By tag */}
        {allTags.length > 0 && (
          <>
            <div className="px-3 py-1 mt-0.5 border-t border-shelf-border/40 pt-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle flex items-center gap-1.5">
                <Hash size={9} />
                By tag
              </p>
            </div>
            <div className="max-h-36 overflow-y-auto">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onMouseDown={e => { e.preventDefault(); onSelectByTag(tag); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-1 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
                >
                  <Hash size={10} className="shrink-0 text-shelf-text-subtle" />
                  <span className="truncate">{tag}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* By provider */}
        {providers.length > 1 && (
          <>
            <div className="px-3 py-1 mt-0.5 border-t border-shelf-border/40 pt-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle flex items-center gap-1.5">
                <Globe size={9} />
                By provider
              </p>
            </div>
            {providers.map(p => (
              <button
                key={p}
                onMouseDown={e => { e.preventDefault(); onSelectByProvider(p); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
              >
                <span className="text-xs text-shelf-text-subtle bg-shelf-elevated px-1.5 py-0.5 rounded shrink-0">
                  {providerLabel(p)}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0',
          open
            ? 'bg-shelf-accent/20 text-shelf-accent'
            : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
        )}
        title="Smart select"
      >
        <ListFilter size={13} />
        Select
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && createPortal(dropdownContent, document.body)}
    </>
  )
}

// ─── Tag bulk menu ────────────────────────────────────────────────────────────

interface TagBulkMenuProps {
  allTags: string[]
  tagState: (tag: string) => 'all' | 'some' | 'none'
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}

function TagBulkMenu({ allTags, tagState, onAdd, onRemove }: TagBulkMenuProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [newTag, setNewTag] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const filtered = allTags.filter(t => t.toLowerCase().includes(search.toLowerCase()))
  const normalizedNew = newTag.trim().toLowerCase().replace(/\s+/g, '-')
  const canCreate = normalizedNew.length > 0 && !allTags.includes(normalizedNew)

  useEffect(() => {
    if (!open) return
    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0)
    else { setSearch(''); setNewTag('') }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById('bulk-tag-portal')
      if (triggerRef.current?.contains(e.target as Node) || portal?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleCreate = () => {
    if (!normalizedNew) return
    onAdd(normalizedNew)
    setNewTag('')
    searchRef.current?.focus()
  }

  const dropdownContent = (
    <div
      id="bulk-tag-portal"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(rect ? { left: rect.right - 260, top: rect.bottom + 4, width: 260 } : { display: 'none' }),
      }}
    >
      <div className="rounded-md border border-shelf-border bg-shelf-surface shadow-lg overflow-hidden">
        <div className="p-2 border-b border-shelf-border">
          <input
            ref={searchRef}
            type="text"
            value={search || newTag}
            onChange={e => { const v = e.target.value; setSearch(v); setNewTag(v) }}
            onKeyDown={e => {
              if (e.key === 'Enter' && canCreate) { e.preventDefault(); handleCreate() }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Search or create tag…"
            className="w-full bg-transparent text-sm text-shelf-text placeholder:text-shelf-text-subtle outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-xs text-shelf-text-subtle">No tags yet</p>
          )}
          {filtered.map(tag => {
            const state = tagState(tag)
            return (
              <div key={tag} className="flex items-center gap-2 px-3 py-1.5 hover:bg-shelf-elevated">
                <div className="flex-1 min-w-0"><TagBadge tag={tag} size="sm" /></div>
                <div className="flex items-center gap-1 shrink-0">
                  {state === 'some' && <span className="text-[10px] text-shelf-text-subtle mr-1">some</span>}
                  {state !== 'all' && (
                    <button
                      onMouseDown={e => { e.preventDefault(); onAdd(tag) }}
                      className="p-1 rounded text-shelf-text-subtle hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      title={`Add "${tag}" to all selected`}
                    ><Plus size={12} /></button>
                  )}
                  {state !== 'none' && (
                    <button
                      onMouseDown={e => { e.preventDefault(); onRemove(tag) }}
                      className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                      title={`Remove "${tag}" from selected`}
                    ><Minus size={12} /></button>
                  )}
                </div>
              </div>
            )
          })}
          {canCreate && (
            <button
              onMouseDown={e => { e.preventDefault(); handleCreate() }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
            >
              <Plus size={12} className="shrink-0 opacity-60" />
              <span>Create <span className="font-medium text-shelf-text">"{normalizedNew}"</span></span>
            </button>
          )}
        </div>
        <div className="px-3 py-1.5 border-t border-shelf-border/50">
          <p className="text-[10px] text-shelf-text-subtle">
            <Plus size={9} className="inline mr-0.5" /> add ·
            <Minus size={9} className="inline mx-0.5" /> remove from selected
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0',
          open ? 'bg-shelf-accent/20 text-shelf-accent' : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
        )}
      >
        <Tag size={13} />
        Tags
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && createPortal(dropdownContent, document.body)}
    </>
  )
}

// ─── Group bulk menu ──────────────────────────────────────────────────────────

interface GroupBulkMenuProps {
  groups: import('@/types').Group[]
  onMove: (groupId: string | null) => void
}

function GroupBulkMenu({ groups, onMove }: GroupBulkMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!open) return
    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById('bulk-group-portal')
      if (triggerRef.current?.contains(e.target as Node) || portal?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const dropdownContent = (
    <div
      id="bulk-group-portal"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(rect ? { left: rect.right - 200, top: rect.bottom + 4, width: 200 } : { display: 'none' }),
      }}
    >
      <div className="rounded-md border border-shelf-border bg-shelf-surface shadow-lg overflow-hidden py-1">
        {groups.map(group => (
          <button
            key={group.id}
            onMouseDown={e => { e.preventDefault(); onMove(group.id); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
            <span className="truncate">{group.name}</span>
          </button>
        ))}
        <div className="border-t border-shelf-border/50 mt-1 pt-1">
          <button
            onMouseDown={e => { e.preventDefault(); onMove(null); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-subtle hover:text-shelf-text transition-colors"
          >
            <Folder size={12} className="shrink-0" />
            <span>Remove from group</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0',
          open ? 'bg-shelf-accent/20 text-shelf-accent' : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
        )}
      >
        <Folder size={13} />
        Group
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && createPortal(dropdownContent, document.body)}
    </>
  )
}
