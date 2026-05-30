import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, Mail, Copy, Check, Pencil, Trash2,
  ArrowUpCircle, Plus, X, Clock,
} from 'lucide-react'
import { cn, copyToClipboard } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { StatusBadge } from './StatusBadge'
import { useToast } from './ui/toast'
import { Account } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Action {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  onSelect: () => void
  keywords?: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onOpenSettings: () => void
}

// ─── Highlight matching text ──────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-shelf-accent/30 text-shelf-text rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandPalette({ open, onClose, onOpenSettings }: CommandPaletteProps) {
  const { accounts, openCreateForm, openEditForm, deleteAccount, setActiveAccount, showConfirm, updateAccount } = useAccountStore()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlighted(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Build items: static actions + filtered accounts
  const staticActions: Action[] = [
    {
      id: 'new-account',
      label: 'New Account',
      description: 'Add a new email account',
      icon: <Plus size={14} />,
      keywords: 'create add new account',
      onSelect: () => { openCreateForm(); onClose() },
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Appearance, updates',
      icon: <ArrowUpCircle size={14} />,
      keywords: 'settings preferences theme',
      onSelect: () => { onOpenSettings(); onClose() },
    },
  ]

  const q = query.trim().toLowerCase()

  const matchedActions = q
    ? staticActions.filter(a =>
        a.label.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q) ||
        (a.keywords ?? '').toLowerCase().includes(q)
      )
    : staticActions

  const matchedAccounts = q
    ? accounts.filter(a =>
        a.email.toLowerCase().includes(q) ||
        a.provider.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      ).slice(0, 8)
    : accounts.slice(0, 6)

  // Flat list for keyboard nav
  const totalItems = matchedActions.length + matchedAccounts.length
  const clampedHighlight = Math.min(highlighted, Math.max(0, totalItems - 1))

  const handleSelect = useCallback((idx: number) => {
    if (idx < matchedActions.length) {
      matchedActions[idx].onSelect()
    } else {
      const account = matchedAccounts[idx - matchedActions.length]
      if (account) {
        setActiveAccount(account.id)
        onClose()
      }
    }
  }, [matchedActions, matchedAccounts, setActiveAccount, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(clampedHighlight)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${clampedHighlight}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [clampedHighlight])

  // Reset highlight when query changes
  useEffect(() => { setHighlighted(0) }, [query])

  const handleCopy = async (e: React.MouseEvent, account: Account, field: 'email' | 'password') => {
    e.stopPropagation()
    const val = field === 'email' ? account.email : account.password
    const ok = await copyToClipboard(val)
    if (ok) {
      setCopied(`${account.id}-${field}`)
      toast(`${field === 'email' ? 'Email' : 'Password'} copied`, 'success')
      updateAccount(account.id, { last_used_at: new Date().toISOString() })
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleDelete = (e: React.MouseEvent, account: Account) => {
    e.stopPropagation()
    showConfirm({
      title: 'Delete account?',
      description: `This will permanently delete ${account.email}.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteAccount(account.id)
        toast('Account deleted', 'info')
      },
    })
    onClose()
  }

  if (!open) return null

  const content = (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Panel */}
      <div className="relative w-full max-w-xl mx-4 bg-shelf-surface border border-shelf-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-shelf-border">
          <Search size={15} className="text-shelf-text-subtle shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search accounts, actions…"
            className="flex-1 bg-transparent text-sm text-shelf-text placeholder:text-shelf-text-subtle outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-shelf-text-subtle hover:text-shelf-text transition-colors">
              <X size={13} />
            </button>
          )}
          <kbd className="text-[10px] text-shelf-text-subtle border border-shelf-border rounded px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-1">
          {totalItems === 0 && (
            <p className="px-4 py-6 text-sm text-shelf-text-subtle text-center">No results for "{query}"</p>
          )}

          {/* Static actions */}
          {matchedActions.length > 0 && (
            <>
              {q === '' && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle">
                  Actions
                </p>
              )}
              {matchedActions.map((action, i) => (
                <button
                  key={action.id}
                  data-idx={i}
                  onMouseDown={() => action.onSelect()}
                  onMouseEnter={() => setHighlighted(i)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    clampedHighlight === i ? 'bg-shelf-elevated' : 'hover:bg-shelf-elevated/50'
                  )}
                >
                  <span className="text-shelf-text-subtle shrink-0">{action.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-shelf-text">
                      <Highlight text={action.label} query={q} />
                    </p>
                    {action.description && (
                      <p className="text-xs text-shelf-text-subtle truncate">{action.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Accounts */}
          {matchedAccounts.length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle">
                {q ? 'Accounts' : 'Recent Accounts'}
              </p>
              {matchedAccounts.map((account, i) => {
                const idx = matchedActions.length + i
                const isHighlighted = clampedHighlight === idx
                return (
                  <div
                    key={account.id}
                    data-idx={idx}
                    onMouseDown={() => { setActiveAccount(account.id); onClose() }}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group',
                      isHighlighted ? 'bg-shelf-elevated' : 'hover:bg-shelf-elevated/50'
                    )}
                  >
                    <Mail size={14} className="text-shelf-text-subtle shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-shelf-text truncate">
                          <Highlight text={account.email} query={q} />
                        </span>
                        <span className="text-[10px] text-shelf-text-subtle bg-shelf-elevated px-1.5 py-0.5 rounded shrink-0">
                          {account.provider}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={account.status} size="sm" />
                        {account.last_used_at && (
                          <span className="flex items-center gap-1 text-[10px] text-shelf-text-subtle">
                            <Clock size={9} />
                            used {new Date(account.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                        {account.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] text-shelf-text-subtle bg-shelf-elevated px-1 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick actions — visible on hover/highlight */}
                    <div className={cn(
                      'flex items-center gap-1 shrink-0 transition-opacity',
                      isHighlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}>
                      <button
                        onMouseDown={e => handleCopy(e, account, 'email')}
                        className="p-1.5 rounded text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-border transition-colors"
                        title="Copy email"
                      >
                        {copied === `${account.id}-email` ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                      <button
                        onMouseDown={e => handleCopy(e, account, 'password')}
                        className="p-1.5 rounded text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-border transition-colors"
                        title="Copy password"
                      >
                        {copied === `${account.id}-password` ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                      <button
                        onMouseDown={e => { e.stopPropagation(); openEditForm(account); onClose() }}
                        className="p-1.5 rounded text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-border transition-colors"
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onMouseDown={e => handleDelete(e, account)}
                        className="p-1.5 rounded text-shelf-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-shelf-border bg-shelf-bg/50">
          <span className="text-[10px] text-shelf-text-subtle flex items-center gap-1">
            <kbd className="border border-shelf-border rounded px-1 font-mono">↑↓</kbd> navigate
          </span>
          <span className="text-[10px] text-shelf-text-subtle flex items-center gap-1">
            <kbd className="border border-shelf-border rounded px-1 font-mono">↵</kbd> open
          </span>
          <span className="text-[10px] text-shelf-text-subtle flex items-center gap-1">
            <kbd className="border border-shelf-border rounded px-1 font-mono">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
