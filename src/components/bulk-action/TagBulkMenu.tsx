import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Tag, ChevronDown, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagBadge } from '@/components/TagBadge'
import { useDropdownPortal } from './useDropdownPortal'

interface Props {
  allTags: string[]
  tagState: (tag: string) => 'all' | 'some' | 'none'
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}

export function TagBulkMenu({ allTags, tagState, onAdd, onRemove }: Props) {
  const { triggerRef, open, setOpen, rect } = useDropdownPortal('bulk-tag-portal')
  const [query, setQuery]   = useState('')
  const searchRef           = useRef<HTMLInputElement>(null)

  const filtered      = allTags.filter(t => t.toLowerCase().includes(query.toLowerCase()))
  const normalized    = query.trim().toLowerCase().replace(/\s+/g, '-')
  const canCreate     = normalized.length > 0 && !allTags.includes(normalized)

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0)
    else setQuery('')
  }, [open])

  const handleCreate = () => {
    if (!normalized) return
    onAdd(normalized)
    setQuery('')
    searchRef.current?.focus()
  }

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

      {open && createPortal(
        <div
          id="bulk-tag-portal"
          style={{
            position: 'fixed', zIndex: 9999,
            ...(rect ? { left: rect.right - 260, top: rect.bottom + 4, width: 260 } : { display: 'none' }),
          }}
        >
          <div className="rounded-md border border-shelf-border bg-shelf-surface shadow-lg overflow-hidden">
            <div className="p-2 border-b border-shelf-border">
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
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
                  <span>Create <span className="font-medium text-shelf-text">"{normalized}"</span></span>
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
        </div>,
        document.body
      )}
    </>
  )
}
