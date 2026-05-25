import React, { useState } from 'react'
import { Copy, Check, Eye, EyeOff, MoreHorizontal, Pencil, Trash2, Clock, Copy as CopyIcon } from 'lucide-react'
import { cn, copyToClipboard, formatDate } from '@/lib/utils'
import { Account, AccountStatus, STATUS_CONFIG } from '@/types'
import { useAccountStore } from '@/store/accountStore'
import { StatusBadge } from './StatusBadge'
import { TagBadge } from './TagBadge'
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

export function AccountCard({ account, isSelected, isActive, onSelect, onClick }: AccountCardProps) {
  const { openEditForm, deleteAccount, duplicateAccount, updateAccount, setConfirmDeleteId, confirmDeleteId } = useAccountStore()
  const { toast } = useToast()
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const isConfirmingDelete = confirmDeleteId === account.id

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyToClipboard(account.email)
    if (ok) {
      setCopiedEmail(true)
      toast('Email copied', 'success')
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const handleCopyPass = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyToClipboard(account.password)
    if (ok) {
      setCopiedPass(true)
      toast('Password copied', 'success')
      setTimeout(() => setCopiedPass(false), 2000)
    }
  }

  const handleDeleteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setConfirmDeleteId(account.id)
  }

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteAccount(account.id)
    toast('Account deleted', 'info')
  }

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDeleteId(null)
  }

  const handleDuplicate = async () => {
    const result = await duplicateAccount(account.id)
    if (result) toast('Account duplicated', 'success')
  }

  const handleStatusChange = async (status: AccountStatus) => {
    await updateAccount(account.id, { status })
    toast(`Status → ${STATUS_CONFIG[status].label}`, 'success')
  }

  const maskedPassword = account.password
    ? showPass ? account.password : '•'.repeat(Math.min(account.password.length, 12))
    : '—'

  // Confirm delete overlay
  if (isConfirmingDelete) {
    return (
      <div
        className={cn(
          'group relative flex flex-col gap-2 px-4 py-3 border-b border-shelf-border-subtle',
          'bg-red-500/5 border-l-2 border-l-red-500/50'
        )}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm text-shelf-text font-medium">Delete this account?</p>
        <p className="text-xs text-shelf-text-muted font-mono truncate">{account.email}</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={handleDeleteConfirm}
            className="flex-1 h-7 rounded-md bg-red-500/15 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors border border-red-500/20"
          >
            Delete
          </button>
          <button
            onClick={handleDeleteCancel}
            className="flex-1 h-7 rounded-md bg-shelf-elevated text-shelf-text-muted text-xs font-medium hover:bg-shelf-border transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-2 px-4 py-3 border-b border-shelf-border-subtle cursor-pointer transition-all duration-100',
        isActive
          ? 'bg-shelf-accent/8 border-l-2 border-l-shelf-accent'
          : 'hover:bg-shelf-elevated/50',
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

      {/* Tags */}
      {account.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-7">
          {account.tags.map(tag => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>
      )}

      {/* Notes preview */}
      {account.notes && (
        <p className="text-xs text-shelf-text-subtle pl-7 truncate">{account.notes}</p>
      )}

      {/* Date */}
      <div className="flex items-center gap-1 pl-7">
        <Clock size={10} className="text-shelf-text-subtle" />
        <span className="text-[10px] text-shelf-text-subtle">
          {formatDate(account.updated_at)}
        </span>
      </div>
    </div>
  )
}
