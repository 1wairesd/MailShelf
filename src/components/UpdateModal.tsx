import { useEffect, useState } from 'react'
import { ArrowUpCircle, RefreshCw, CheckCircle, AlertCircle, Download, RotateCcw, Settings } from 'lucide-react'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { UpdateStatus, UpdateInfo } from '@/hooks/useUpdateCheck'
import { cn } from '@/lib/utils'
import { api, AppSettings } from '@/lib/api'

interface UpdateModalProps {
  open: boolean
  onClose: () => void
  status: UpdateStatus
  info: UpdateInfo
  onCheck: () => void
  onInstall: () => void
}

type Tab = 'status' | 'settings'

const INTERVAL_OPTIONS: { value: AppSettings['updates']['checkIntervalHours']; label: string }[] = [
  { value: 0,  label: 'Never (manual only)' },
  { value: 1,  label: 'Every hour' },
  { value: 4,  label: 'Every 4 hours' },
  { value: 24, label: 'Once a day' },
]

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative rounded-full transition-colors duration-200 focus:outline-none shrink-0',
        value ? 'bg-shelf-accent' : 'bg-shelf-border'
      )}
      style={{ width: 28, height: 16 }}
    >
      <span
        className="absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: value ? 'translateX(12px)' : 'translateX(0)' }}
      />
    </button>
  )
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function UpdateSettings() {
  const [settings, setSettings] = useState<AppSettings['updates'] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.settings.get().then(s => setSettings(s.updates)).catch(() => {})
  }, [])

  const save = async (patch: Partial<AppSettings['updates']>) => {
    if (!settings) return
    setSaving(true)
    const next = { ...settings, ...patch }
    setSettings(next)
    await api.settings.updateUpdates(next)
    api.settings.applyUpdaterSettings()
    setSaving(false)
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-8 text-shelf-text-subtle text-sm">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Check on startup */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-shelf-text">Check on startup</p>
          <p className="text-xs text-shelf-text-subtle mt-0.5">
            Look for updates when the app launches
          </p>
        </div>
        <Toggle
          value={settings.checkOnStartup}
          onChange={v => save({ checkOnStartup: v })}
        />
      </div>

      {/* Auto-download */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-shelf-text">Auto-download</p>
          <p className="text-xs text-shelf-text-subtle mt-0.5">
            Download updates silently in the background
          </p>
        </div>
        <Toggle
          value={settings.autoDownload}
          onChange={v => save({ autoDownload: v })}
        />
      </div>

      {/* Check interval */}
      <div>
        <p className="text-sm text-shelf-text mb-2">Check interval</p>
        <div className="flex flex-col gap-1.5">
          {INTERVAL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => save({ checkIntervalHours: opt.value })}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-sm transition-colors',
                settings.checkIntervalHours === opt.value
                  ? 'border-shelf-accent bg-shelf-accent/8 text-shelf-text'
                  : 'border-shelf-border text-shelf-text-muted hover:bg-shelf-elevated'
              )}
            >
              <div className={cn(
                'w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center',
                settings.checkIntervalHours === opt.value ? 'border-shelf-accent' : 'border-shelf-border'
              )}>
                {settings.checkIntervalHours === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-shelf-accent" />
                )}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channel */}
      <div>
        <p className="text-sm text-shelf-text mb-0.5">Update channel</p>
        <p className="text-xs text-shelf-text-subtle mb-2">
          Beta includes pre-releases — may be unstable
        </p>
        <div className="flex gap-2">
          {(['stable', 'beta'] as const).map(ch => (
            <button
              key={ch}
              onClick={() => save({ channel: ch })}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors capitalize',
                settings.channel === ch
                  ? 'border-shelf-accent bg-shelf-accent/8 text-shelf-accent'
                  : 'border-shelf-border text-shelf-text-muted hover:bg-shelf-elevated'
              )}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {saving && (
        <p className="text-xs text-shelf-text-subtle text-center">Saving…</p>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function UpdateModal({ open, onClose, status, info, onCheck, onInstall }: UpdateModalProps) {
  const [tab, setTab] = useState<Tab>('status')

  // Reset to status tab when modal opens
  useEffect(() => {
    if (open) setTab('status')
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader title="Updates" onClose={onClose} />

      {/* Tabs */}
      <div className="flex border-b border-shelf-border px-5">
        {(['status', 'settings'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 px-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors capitalize mr-4',
              tab === t
                ? 'border-shelf-accent text-shelf-accent'
                : 'border-transparent text-shelf-text-muted hover:text-shelf-text'
            )}
          >
            {t === 'settings' && <Settings size={11} />}
            {t === 'status' ? 'Status' : 'Settings'}
          </button>
        ))}
      </div>

      <DialogBody>
        {tab === 'status' ? (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            {/* Icon */}
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center',
              status === 'idle' || status === 'checking' ? 'bg-shelf-elevated' : '',
              status === 'available' || status === 'downloading' ? 'bg-shelf-accent/15' : '',
              status === 'downloaded' ? 'bg-shelf-accent/20' : '',
              status === 'up-to-date' ? 'bg-green-500/10' : '',
              status === 'error' ? 'bg-red-500/10' : '',
            )}>
              {(status === 'idle' || status === 'checking') && (
                <RefreshCw size={24} className={cn('text-shelf-text-muted', status === 'checking' && 'animate-spin')} />
              )}
              {(status === 'available' || status === 'downloading') && (
                <Download size={24} className="text-shelf-accent" />
              )}
              {status === 'downloaded' && (
                <ArrowUpCircle size={24} className="text-shelf-accent" />
              )}
              {status === 'up-to-date' && (
                <CheckCircle size={24} className="text-green-400" />
              )}
              {status === 'error' && (
                <AlertCircle size={24} className="text-red-400" />
              )}
            </div>

            {status === 'idle' && (
              <div>
                <p className="text-sm font-medium text-shelf-text">Check for updates</p>
                <p className="text-xs text-shelf-text-muted mt-1">Click below to check for a new version</p>
              </div>
            )}
            {status === 'checking' && (
              <div>
                <p className="text-sm font-medium text-shelf-text">Checking…</p>
                <p className="text-xs text-shelf-text-muted mt-1">Connecting to update server</p>
              </div>
            )}
            {status === 'available' && (
              <div>
                <p className="text-sm font-medium text-shelf-text">Update available — v{info.version}</p>
                <p className="text-xs text-shelf-text-muted mt-1">Downloading in the background…</p>
              </div>
            )}
            {status === 'downloading' && (
              <div className="w-full">
                <p className="text-sm font-medium text-shelf-text mb-2">
                  Downloading v{info.version}…
                </p>
                <div className="w-full h-1.5 bg-shelf-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-shelf-accent rounded-full transition-all duration-300"
                    style={{ width: `${info.percent ?? 0}%` }}
                  />
                </div>
                <p className="text-xs text-shelf-text-subtle mt-1.5">{info.percent ?? 0}%</p>
              </div>
            )}
            {status === 'downloaded' && (
              <div>
                <p className="text-sm font-medium text-shelf-text">v{info.version} ready to install</p>
                <p className="text-xs text-shelf-text-muted mt-1">Restart the app to apply the update</p>
              </div>
            )}
            {status === 'up-to-date' && (
              <div>
                <p className="text-sm font-medium text-shelf-text">You're up to date</p>
                <p className="text-xs text-shelf-text-muted mt-1">No updates available right now</p>
              </div>
            )}
            {status === 'error' && (
              <div>
                <p className="text-sm font-medium text-shelf-text">Update check failed</p>
                <p className="text-xs text-shelf-text-muted mt-1 max-w-[220px] break-words">
                  {info.error ?? 'Unknown error'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <UpdateSettings />
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>

        {tab === 'status' && (
          status === 'downloaded' ? (
            <Button size="sm" onClick={onInstall} className="gap-1.5">
              <RotateCcw size={13} />
              Restart & Install
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onCheck}
              disabled={status === 'checking' || status === 'downloading' || status === 'available'}
              className="gap-1.5"
            >
              <RefreshCw size={13} className={cn(status === 'checking' && 'animate-spin')} />
              {status === 'checking' ? 'Checking…' : 'Check now'}
            </Button>
          )
        )}
      </DialogFooter>
    </Dialog>
  )
}
