import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X, CheckSquare, Tag, Plus, Minus, ChevronDown } from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { AccountStatus, STATUS_CONFIG } from '@/types'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { TagBadge } from './TagBadge'
import { useToast } from './ui/toast'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

export function BulkActionBar() {
  const { selectedIds, accounts, allTags, bulkDelete, bulkUpdateStatus, bulkUpdateTag, clearSelection, selectAll, showConfirm } = useAccountStore()
  const { toast } = useToast()
  const count = selectedIds.size

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

  // Compute tag state across selected accounts:
  // - "all"  → every selected account has this tag
  // - "some" → some (but not all) selected accounts have this tag
  // - "none" → no selected account has this tag
  const selectedAccounts = accounts.filter(a => selectedIds.has(a.id))
  const tagState = (tag: string): 'all' | 'some' | 'none' => {
    const withTag = selectedAccounts.filter(a => a.tags.includes(tag)).length
    if (withTag === 0) return 'none'
    if (withTag === selectedAccounts.length) return 'all'
    return 'some'
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

      {/* Tag management */}
      <TagBulkMenu
        allTags={allTags}
        tagState={tagState}
        onAdd={handleTagAdd}
        onRemove={handleTagRemove}
      />

      <div className="w-px h-4 bg-shelf-border" />

      {/* Change status */}
      <Select
        value=""
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
        placeholder="Set status…"
        className="w-36"
      />

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
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0)
    } else {
      setSearch('')
      setNewTag('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById('bulk-tag-portal')
      if (
        triggerRef.current?.contains(e.target as Node) ||
        portal?.contains(e.target as Node)
      ) return
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
        ...(rect ? {
          left: rect.right - 260, // right-align to trigger
          top: rect.bottom + 4,
          width: 260,
        } : { display: 'none' }),
      }}
    >
      <div className="rounded-md border border-shelf-border bg-shelf-surface shadow-lg overflow-hidden">
        {/* Search / create input */}
        <div className="p-2 border-b border-shelf-border">
          <input
            ref={searchRef}
            type="text"
            value={search || newTag}
            onChange={e => {
              const v = e.target.value
              setSearch(v)
              setNewTag(v)
            }}
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

        {/* Tag list */}
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-xs text-shelf-text-subtle">No tags yet</p>
          )}

          {filtered.map(tag => {
            const state = tagState(tag)
            return (
              <div
                key={tag}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-shelf-elevated group"
              >
                {/* Tag badge */}
                <div className="flex-1 min-w-0">
                  <TagBadge tag={tag} size="sm" />
                </div>

                {/* State indicator + action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {state === 'some' && (
                    <span className="text-[10px] text-shelf-text-subtle mr-1">some</span>
                  )}

                  {/* Add button — shown when not all have it */}
                  {state !== 'all' && (
                    <button
                      onMouseDown={e => { e.preventDefault(); onAdd(tag) }}
                      className="p-1 rounded text-shelf-text-subtle hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      title={`Add "${tag}" to all selected`}
                    >
                      <Plus size={12} />
                    </button>
                  )}

                  {/* Remove button — shown when at least some have it */}
                  {state !== 'none' && (
                    <button
                      onMouseDown={e => { e.preventDefault(); onRemove(tag) }}
                      className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                      title={`Remove "${tag}" from selected`}
                    >
                      <Minus size={12} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Create new tag option */}
          {canCreate && (
            <button
              onMouseDown={e => { e.preventDefault(); handleCreate() }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
            >
              <Plus size={12} className="shrink-0 opacity-60" />
              <span>
                Create <span className="font-medium text-shelf-text">"{normalizedNew}"</span>
              </span>
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
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
          open
            ? 'bg-shelf-accent/20 text-shelf-accent'
            : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
        )}
      >
        <Tag size={13} />
        Tags
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && createPortal(dropdownContent, document.body)}
    </>
  )
}
