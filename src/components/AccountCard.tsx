import React, { useState, useRef, useEffect } from 'react'
import { Copy, Check, Eye, EyeOff, MoreHorizontal, Pencil, Trash2, Clock, Copy as CopyIcon, Plus } from 'lucide-react'
import { cn, copyToClipboard, formatDate } from '@/lib/utils'
import { Account, AccountStatus, STATUS_CONFIG } from '@/types'
import { useAccountStore } from '@/store/accountStore'
import { StatusBadge } from './StatusBadge'
import { TagBadge } from './TagBadge'
import { TagInput } from './TagInput'
import { Dropdown } from './ui/dropdown'
import { Tooltip } from './ui/tooltip'
import { useToast } from './ui/toast'

interface AccountCardProps {
  account: Account
  isSelected: boolean
  isActive: boolean
  onSelect: (e: React.MouseEvent) => void
  onClick: () => void
}

const STATUS_ITEMS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value: value as AccountStatus,
  label: cfg.label,
  dotColor: cfg.dotColor,
}))

export const AccountCard = React.memo(function AccountCard({ account, isSelected, isActive, onSelect, onClick }: AccountCardProps) {
  // allTags is the only reactive value we need — get actions via getState() so they
  // never trigger re-renders (Zustand action references are stable but reading them
  // through the hook still subscribes this component to the whole store)
  const allTags = useAccountStore(s => s.allTags)
  const {
    openEditForm,
    deleteAccount,
    duplicateAccount,
    updateAccount,
    touchAccount,
    showConfirm,
  } = useAccountStore.getState()
  const { toast } = useToast()
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const tagInputRef = useRef<HTMLDivElement>(null)

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyToClipboard(account.email)
    if (ok) {
      setCopiedEmail(true)
      toast('Email copied', 'success')
      setTimeout(() => setCopiedEmail(false), 2000)
      touchAccount(account.id)
    }
  }

  const handleCopyPass = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyToClipboard(account.password)
    if (ok) {
      setCopiedPass(true)
      toast('Password copied', 'success')
      setTimeout(() => setCopiedPass(false), 2000)
      touchAccount(account.id)
    }
  }

  const handleDeleteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    showConfirm({
      title: 'Delete account?',
      description: `This will permanently delete ${account.email}. This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteAccount(account.id)
        toast('Account deleted', 'info')
      },
    })
  }

  const handleDuplicate = async () => {
    const result = await duplicateAccount(account.id)
    if (result) toast('Account duplicated', 'success')
  }

  const handleStatusChange = async (status: AccountStatus) => {
    await updateAccount(account.id, { status })
    toast(`Status → ${STATUS_CONFIG[status].label}`, 'success')
  }

  const handleTagsChange = async (tags: string[]) => {
    await updateAccount(account.id, { tags })
  }

  // Close tag input when clicking outside the card's tag area
  useEffect(() => {
    if (!addingTag) return
    const handler = (e: PointerEvent) => {
      // Also allow clicks inside the portal dropdown (rendered in document.body, outside card DOM)
      const portal = document.getElementById('tag-dropdown-portal')
      if (tagInputRef.current && tagInputRef.current.contains(e.target as Node)) return
      if (portal && portal.contains(e.target as Node)) return
      setAddingTag(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [addingTag])

  const maskedPassword = account.password
    ? showPass ? account.password : '•'.repeat(Math.min(account.password.length, 12))
    : '—'

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-2 px-4 py-3 border-b border-shelf-border-subtle cursor-pointer transition-colors duration-100',
        'border-l-2',
        isActive
          ? 'bg-shelf-accent/8 border-l-shelf-accent'
          : 'border-l-transparent hover:bg-shelf-elevated/50',
        isSelected && !isActive && 'bg-shelf-elevated/30'
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div
          onClick={onSelect}
          className={cn(
            'mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all cursor-pointer',
            isSelected
              ? 'bg-shelf-accent border-shelf-accent'
              : 'border-shelf-border opacity-0 group-hover:opacity-100'
          )}
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Email + provider */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-shelf-text truncate font-mono">
              {account.email}
            </span>
            <span className="text-[10px] text-shelf-text-subtle bg-shelf-elevated px-1.5 py-0.5 rounded shrink-0">
              {account.provider}
            </span>
          </div>

          {/* Password row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn(
              'text-xs font-mono',
              showPass ? 'text-shelf-text-muted' : 'text-shelf-text-subtle tracking-widest'
            )}>
              {maskedPassword}
            </span>
            <button
              onClick={e => { e.stopPropagation(); setShowPass(v => !v) }}
              className="text-shelf-text-subtle hover:text-shelf-text-muted transition-colors opacity-0 group-hover:opacity-100"
            >
              {showPass ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
        </div>

        {/* Status badge — click to change */}
        <Dropdown
          trigger={
            <div onClick={e => e.stopPropagation()}>
              <StatusBadge status={account.status} size="sm" />
            </div>
          }
          items={STATUS_ITEMS.map(s => ({
            label: s.label,
            icon: <span className={cn('w-2 h-2 rounded-full', s.dotColor)} />,
            onClick: () => handleStatusChange(s.value),
            disabled: s.value === account.status,
          }))}
          align="right"
        />

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-drag">
          <Tooltip content="Copy email">
            <button
              onClick={handleCopyEmail}
              className="p-1 rounded text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-border transition-colors"
            >
              {copiedEmail ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          </Tooltip>
          <Tooltip content="Copy password">
            <button
              onClick={handleCopyPass}
              className="p-1 rounded text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-border transition-colors"
            >
              {copiedPass ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          </Tooltip>
          <Dropdown
            trigger={
              <button className="p-1 rounded text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-border transition-colors">
                <MoreHorizontal size={13} />
              </button>
            }
            items={[
              {
                label: 'Edit',
                icon: <Pencil size={13} />,
                onClick: () => openEditForm(account),
              },
              {
                label: 'Duplicate',
                icon: <CopyIcon size={13} />,
                onClick: handleDuplicate,
              },
              {
                label: 'Delete',
                icon: <Trash2 size={13} />,
                onClick: () => handleDeleteClick(),
                variant: 'destructive',
                separator: true,
              },
            ]}
          />
        </div>
      </div>

      {/* Tags + quick-add */}
      <div
        ref={tagInputRef}
        className="flex flex-wrap gap-1 pl-7 items-center"
      >
        {account.tags.map(tag => (
          <TagBadge key={tag} tag={tag} size="sm" />
        ))}

        {addingTag ? (
          <div className="flex-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
            <TagInput
              tags={account.tags}
              allTags={allTags}
              onChange={handleTagsChange}
              placeholder="Add tag…"
              compact
            />
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setAddingTag(true) }}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full border border-dashed border-shelf-border',
              'px-1.5 py-0.5 text-[10px] text-shelf-text-subtle',
              'hover:text-shelf-accent hover:border-shelf-accent transition-colors',
              'opacity-0 group-hover:opacity-100'
            )}
          >
            <Plus size={9} />
            tag
          </button>
        )}
      </div>

      {/* Notes preview */}
      {account.notes && (
        <p className="text-xs text-shelf-text-subtle pl-7 truncate">{account.notes}</p>
      )}

      {/* Date */}
      <div className="flex items-center gap-2 pl-7">
        <div className="flex items-center gap-1">
          <Clock size={10} className="text-shelf-text-subtle" />
          <span className="text-[10px] text-shelf-text-subtle">
            {formatDate(account.updated_at)}
          </span>
        </div>
        {account.last_used_at && (
          <>
            <span className="text-[10px] text-shelf-border">·</span>
            <span className="text-[10px] text-shelf-text-subtle" title="Last used">
              used {formatDate(account.last_used_at)}
            </span>
          </>
        )}
        {account.status === 'archived' && account.archived_at && (
          <>
            <span className="text-[10px] text-shelf-border">·</span>
            <span className="text-[10px] text-shelf-text-subtle" title="Archived">
              archived {formatDate(account.archived_at)}
            </span>
          </>
        )}
      </div>
    </div>
  )
})
