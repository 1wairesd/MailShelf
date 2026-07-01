import { useState, useRef } from 'react'
import {
  Copy, Check, Eye, EyeOff, Pencil, Trash2,
  Clock, Calendar, Mail,
  Lock, Tag, FileText,
  Globe, X, Archive
} from 'lucide-react'
import { cn, copyToClipboard, formatDate, formatDateFull } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { StatusBadge } from './StatusBadge'
import { InlineTagEditor } from './TagInput'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { useToast } from './ui/toast'
import { Account, AccountStatus, STATUS_CONFIG } from '@/types'

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

export function AccountDetail() {
  // Granular selectors — component only re-renders when its own slice changes
  const account = useAccountStore(s => {
    const found = s.accounts.find(a => a.id === s.activeAccountId)
    return found ?? null
  })
  const allTags = useAccountStore(s => s.allTags)
  // Actions are stable references — read from getState() to avoid subscribing to them
  const { openEditForm, updateAccount, touchAccount, setActiveAccount, showConfirm, deleteAccount } =
    useAccountStore.getState()

  const { toast } = useToast()
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Keep a stable reference to the last found account so the panel doesn't
  // flash/disappear during brief moments when accounts[] is being reloaded
  // (e.g. right after an update triggers loadAccounts).
  const lastAccountRef = useRef<Account | null>(null)
  if (account) lastAccountRef.current = account
  const displayed = account ?? lastAccountRef.current
  if (!displayed) return null

  const handleCopyEmail = async () => {
    const ok = await copyToClipboard(displayed.email)
    if (ok) {
      setCopiedEmail(true)
      toast('Email copied', 'success')
      setTimeout(() => setCopiedEmail(false), 2000)
      touchAccount(displayed.id)
    }
  }

  const handleCopyPass = async () => {
    const ok = await copyToClipboard(displayed.password)
    if (ok) {
      setCopiedPass(true)
      toast('Password copied', 'success')
      setTimeout(() => setCopiedPass(false), 2000)
      touchAccount(displayed.id)
    }
  }

  const handleDelete = () => {
    showConfirm({
      title: 'Delete account?',
      description: `This will permanently delete ${displayed.email}. This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteAccount(displayed.id)
        setActiveAccount(null)
      },
    })
  }

  const handleStatusChange = async (status: string) => {
    await updateAccount(displayed.id, { status: status as AccountStatus })
    toast(`Status updated to ${STATUS_CONFIG[status as AccountStatus].label}`, 'success')
  }

  const handleMarkUsed = async () => {
    await updateAccount(displayed.id, { last_used_at: new Date().toISOString() })
    toast('Marked as used', 'success')
  }

  const handleTagsChange = async (tags: string[]) => {
    await updateAccount(displayed.id, { tags })
  }

  return (
    <div className="w-80 shrink-0 border-l border-shelf-border flex flex-col bg-shelf-bg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-shelf-border">
        <h3 className="text-sm font-semibold text-shelf-text">Account Details</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEditForm(displayed)}
            title="Edit"
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            className="hover:text-red-400 hover:bg-red-500/10"
            title="Delete"
          >
            <Trash2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setActiveAccount(null)}
            title="Close"
          >
            <X size={13} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Email */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
            <Mail size={10} />
            Email
          </label>
          <div className="flex items-center gap-2 group">
            <span className="flex-1 text-sm font-mono text-shelf-text break-all">
              {displayed.email}
            </span>
            <button
              onClick={handleCopyEmail}
              className="shrink-0 p-1.5 rounded-md text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated transition-colors opacity-0 group-hover:opacity-100"
            >
              {copiedEmail ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
            <Lock size={10} />
            Password
          </label>
          <div className="flex items-center gap-2 group">
            <span className={cn(
              'flex-1 text-sm font-mono break-all',
              showPass ? 'text-shelf-text' : 'text-shelf-text-subtle tracking-widest'
            )}>
              {displayed.password
                ? showPass ? displayed.password : '•'.repeat(Math.min(displayed.password.length, 16))
                : <span className="text-shelf-text-subtle italic text-xs">not set</span>
              }
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowPass(v => !v)}
                className="p-1.5 rounded-md text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
              >
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              {displayed.password && (
                <button
                  onClick={handleCopyPass}
                  className="p-1.5 rounded-md text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
                >
                  {copiedPass ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Provider */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
            <Globe size={10} />
            Provider
          </label>
          <span className="text-sm text-shelf-text capitalize">{displayed.provider}</span>
        </div>

        {/* Status */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
            Status
          </label>
          <div className="flex items-center gap-2">
            <StatusBadge status={displayed.status} />
            <Select
              value={displayed.status}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
              className="flex-1"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
            <Tag size={10} />
            Tags
          </label>
          <InlineTagEditor
            tags={displayed.tags}
            allTags={allTags}
            onSave={handleTagsChange}
          />
        </div>

        {/* Notes */}
        {displayed.notes && (
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
              <FileText size={10} />
              Notes
            </label>
            <p className="text-sm text-shelf-text-muted leading-relaxed whitespace-pre-wrap">
              {displayed.notes}
            </p>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-2 pt-2 border-t border-shelf-border">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-shelf-text-subtle">
              <Calendar size={11} />
              Created
            </span>
            <span className="text-xs text-shelf-text-muted" title={formatDateFull(displayed.created_at)}>
              {formatDate(displayed.created_at)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-shelf-text-subtle">
              <Clock size={11} />
              Updated
            </span>
            <span className="text-xs text-shelf-text-muted" title={formatDateFull(displayed.updated_at)}>
              {formatDate(displayed.updated_at)}
            </span>
          </div>
          {displayed.last_used_at && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-shelf-text-subtle">
                <Clock size={11} />
                Last used
              </span>
              <span className="text-xs text-shelf-text-muted" title={formatDateFull(displayed.last_used_at)}>
                {formatDate(displayed.last_used_at)}
              </span>
            </div>
          )}
          {displayed.status === 'archived' && displayed.archived_at && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-shelf-text-subtle">
                <Archive size={11} />
                Archived
              </span>
              <span className="text-xs text-shelf-text-muted" title={formatDateFull(displayed.archived_at)}>
                {formatDate(displayed.archived_at)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-shelf-border flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={handleMarkUsed}
        >
          <Clock size={13} />
          Mark Used
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => openEditForm(displayed)}
        >
          <Pencil size={13} />
          Edit
        </Button>
      </div>
    </div>
  )
}
