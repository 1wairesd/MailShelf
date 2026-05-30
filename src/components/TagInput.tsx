import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagBadge } from './TagBadge'

// ─── Portal dropdown ─────────────────────────────────────────────────────────

interface DropdownPortalProps {
  anchorRef: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
  onClose: () => void
}

/**
 * Renders the dropdown via a portal attached to document.body so it escapes
 * any overflow:hidden / contain:strict ancestor (e.g. the virtualised list).
 * Position is calculated from the anchor's bounding rect.
 */
function DropdownPortal({ anchorRef, children, onClose }: DropdownPortalProps) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Measure anchor and update on scroll/resize
  useEffect(() => {
    const update = () => {
      if (anchorRef.current) {
        setRect(anchorRef.current.getBoundingClientRect())
      }
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchorRef])

  // Close on outside mousedown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && anchorRef.current.contains(e.target as Node)) return
      // Check if click is inside the portal dropdown itself
      const portal = document.getElementById('tag-dropdown-portal')
      if (portal && portal.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])

  if (!rect) return null

  // Flip upward if not enough space below
  const spaceBelow = window.innerHeight - rect.bottom
  const dropdownMaxH = 220 // max-h-48 (192) + footer (~28)
  const showAbove = spaceBelow < dropdownMaxH && rect.top > dropdownMaxH

  const style: React.CSSProperties = {
    position: 'fixed',
    left: rect.left,
    width: rect.width,
    zIndex: 9999,
    ...(showAbove
      ? { bottom: window.innerHeight - rect.top + 4 }
      : { top: rect.bottom + 4 }),
  }

  return createPortal(
    <div id="tag-dropdown-portal" style={style}>
      {children}
    </div>,
    document.body
  )
}

// ─── TagInput ────────────────────────────────────────────────────────────────

interface TagInputProps {
  tags: string[]
  allTags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
  /** Compact mode — used inside AccountCard quick-add */
  compact?: boolean
  /** Called when the input loses focus and has no pending text (for InlineTagEditor to collapse) */
  onBlurEmpty?: () => void
}

export function TagInput({
  tags,
  allTags,
  onChange,
  placeholder = 'Add tag…',
  className,
  compact = false,
  onBlurEmpty,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Suggestions: existing tags not already added, filtered by input
  const suggestions = allTags.filter(
    t => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase())
  )

  const normalizedInput = input.trim().toLowerCase().replace(/\s+/g, '-')
  const canCreate =
    normalizedInput.length > 0 &&
    !tags.includes(normalizedInput) &&
    !allTags.includes(normalizedInput)

  const dropdownItems = [
    ...suggestions,
    ...(canCreate ? [`__create__:${normalizedInput}`] : []),
  ]

  const showDropdown = open && dropdownItems.length > 0

  useEffect(() => {
    setHighlightedIndex(0)
  }, [input])

  // Auto-focus when mounted in compact mode
  useEffect(() => {
    if (compact) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [compact])

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized])
    }
    setInput('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(i => Math.min(i + 1, dropdownItems.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
    }

    if (e.key === 'Enter' || e.key === ',') {
      if (showDropdown && dropdownItems[highlightedIndex]) {
        e.preventDefault()
        addTag(dropdownItems[highlightedIndex].startsWith('__create__:')
          ? dropdownItems[highlightedIndex].slice(11)
          : dropdownItems[highlightedIndex])
      } else if (normalizedInput) {
        e.preventDefault()
        addTag(normalizedInput)
      }
      // If input is empty and dropdown is closed — let Enter bubble to the form
      return
    }

    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const handleBlur = () => {
    // Small delay so onMouseDown in dropdown fires first
    setTimeout(() => {
      setOpen(false)
      if (!input.trim() && onBlurEmpty) {
        onBlurEmpty()
      }
    }, 150)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input area */}
      <div
        className={cn(
          'flex flex-wrap gap-1.5 rounded-md border border-shelf-border bg-shelf-surface transition-colors',
          'focus-within:ring-1 focus-within:ring-shelf-accent focus-within:border-shelf-accent',
          compact ? 'p-1.5 min-h-[30px]' : 'p-2 min-h-[36px]'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <TagBadge
            key={tag}
            tag={tag}
            onRemove={() => removeTag(tag)}
            size="sm"
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className={cn(
            'flex-1 bg-transparent text-shelf-text placeholder:text-shelf-text-subtle outline-none',
            compact ? 'min-w-[80px] text-xs' : 'min-w-[120px] text-sm'
          )}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Dropdown via portal — escapes overflow/contain constraints */}
      {showDropdown && (
        <DropdownPortal
          anchorRef={containerRef}
          onClose={() => setOpen(false)}
        >
          <div className="rounded-md border border-shelf-border bg-shelf-surface shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto py-1">
              {dropdownItems.map((item, i) => {
                const isCreate = item.startsWith('__create__:')
                const label = isCreate ? item.slice(11) : item
                const isHighlighted = i === highlightedIndex

                return (
                  <button
                    key={item}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault() // keep focus in input
                      addTag(label)
                    }}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors',
                      isHighlighted
                        ? 'bg-shelf-accent/15 text-shelf-accent'
                        : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
                    )}
                  >
                    {isCreate ? (
                      <>
                        <Plus size={12} className="shrink-0 opacity-60" />
                        <span>
                          Create <span className="font-medium text-shelf-text">"{label}"</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <TagColorDot tag={label} />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="px-3 py-1.5 border-t border-shelf-border/50">
              <p className="text-[10px] text-shelf-text-subtle">
                ↑↓ navigate · Enter or , to add · Esc to close
              </p>
            </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  )
}

// ─── Color dot ───────────────────────────────────────────────────────────────

function TagColorDot({ tag }: { tag: string }) {
  const colors = [
    'bg-indigo-400', 'bg-purple-400', 'bg-blue-400', 'bg-cyan-400', 'bg-teal-400',
    'bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-pink-400', 'bg-rose-400',
  ]
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return <span className={cn('w-2 h-2 rounded-full shrink-0', colors[Math.abs(hash) % colors.length])} />
}

// ─── InlineTagEditor ─────────────────────────────────────────────────────────

interface InlineTagEditorProps {
  tags: string[]
  allTags: string[]
  onSave: (tags: string[]) => void
  className?: string
}

/**
 * Shows existing tags with remove buttons + a "+ Add tag" button.
 * Clicking the button expands a TagInput; it collapses back when the
 * input loses focus with no pending text.
 */
export function InlineTagEditor({ tags, allTags, onSave, className }: InlineTagEditorProps) {
  const [editing, setEditing] = useState(false)
  const [localTags, setLocalTags] = useState(tags)

  useEffect(() => {
    setLocalTags(tags)
  }, [tags])

  const handleChange = (newTags: string[]) => {
    setLocalTags(newTags)
    onSave(newTags)
  }

  const handleRemove = (tag: string) => {
    const newTags = localTags.filter(t => t !== tag)
    setLocalTags(newTags)
    onSave(newTags)
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5 items-center', className)}>
      {localTags.map(tag => (
        <TagBadge
          key={tag}
          tag={tag}
          onRemove={() => handleRemove(tag)}
        />
      ))}

      {editing ? (
        <div className="flex-1 min-w-[160px]">
          <TagInput
            tags={localTags}
            allTags={allTags}
            onChange={handleChange}
            placeholder="Type to search or create…"
            compact
            onBlurEmpty={() => setEditing(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-dashed border-shelf-border',
            'px-2 py-0.5 text-xs text-shelf-text-subtle hover:text-shelf-text hover:border-shelf-accent',
            'transition-colors'
          )}
        >
          <Plus size={10} />
          Add tag
        </button>
      )}
    </div>
  )
}
