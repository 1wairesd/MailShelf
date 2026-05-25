import React from 'react'
import { ArrowUpCircle, ExternalLink, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { api } from '@/lib/api'
import { UpdateInfo, UpdateStatus } from '@/hooks/useUpdateCheck'
import { cn } from '@/lib/utils'

interface UpdateModalProps {
  open: boolean
  onClose: () => void
  status: UpdateStatus
  info: UpdateInfo | null
  onCheck: () => void
}

export function UpdateModal({ open, onClose, status, info, onCheck }: UpdateModalProps) {
  const handleOpenRelease = () => {
    if (info?.releaseUrl) {
      api.app.openExternal(info.releaseUrl)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader
        title="Check for Updates"
        onClose={onClose}
      />

      <DialogBody>
        <div className="flex flex-col items-center text-center gap-4 py-2">
          {/* Icon */}
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center',
            status === 'checking' && 'bg-shelf-elevated',
            status === 'done' && info?.hasUpdate && 'bg-shelf-accent/15',
            status === 'done' && !info?.hasUpdate && 'bg-green-500/10',
            status === 'error' && 'bg-red-500/10',
            status === 'idle' && 'bg-shelf-elevated',
          )}>
            {status === 'checking' && (
              <RefreshCw size={24} className="text-shelf-text-muted animate-spin" />
            )}
            {status === 'done' && info?.hasUpdate && (
              <ArrowUpCircle size={24} className="text-shelf-accent" />
            )}
            {status === 'done' && !info?.hasUpdate && (
              <CheckCircle size={24} className="text-green-400" />
            )}
            {status === 'error' && (
              <AlertCircle size={24} className="text-red-400" />
            )}
            {status === 'idle' && (
              <RefreshCw size={24} className="text-shelf-text-muted" />
            )}
          </div>

          {/* Message */}
          {status === 'checking' && (
            <div>
              <p className="text-sm font-medium text-shelf-text">Checking for updates…</p>
              <p className="text-xs text-shelf-text-muted mt-1">Connecting to GitHub</p>
            </div>
          )}

          {status === 'done' && info?.hasUpdate && (
            <div>
              <p className="text-sm font-medium text-shelf-text">Update available</p>
              <p className="text-xs text-shelf-text-muted mt-1">
                <span className="text-shelf-text-subtle">{info.currentVersion}</span>
                {' → '}
                <span className="text-shelf-accent font-medium">{info.latestVersion}</span>
              </p>
            </div>
          )}

          {status === 'done' && !info?.hasUpdate && (
            <div>
              <p className="text-sm font-medium text-shelf-text">You're up to date</p>
              <p className="text-xs text-shelf-text-muted mt-1">
                {info?.currentVersion} is the latest version
              </p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <p className="text-sm font-medium text-shelf-text">Couldn't check for updates</p>
              <p className="text-xs text-shelf-text-muted mt-1 max-w-[220px]">
                {info?.error?.includes('Timeout')
                  ? 'Connection timed out. Check your internet connection.'
                  : 'No GitHub repository configured or network error.'}
              </p>
            </div>
          )}

          {status === 'idle' && (
            <div>
              <p className="text-sm font-medium text-shelf-text">Check for updates</p>
              <p className="text-xs text-shelf-text-muted mt-1">
                Current version: {info?.currentVersion ?? '…'}
              </p>
            </div>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>

        {status === 'done' && info?.hasUpdate ? (
          <Button size="sm" onClick={handleOpenRelease} className="gap-1.5">
            <ExternalLink size={13} />
            Download {info.latestVersion}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onCheck}
            disabled={status === 'checking'}
            className="gap-1.5"
          >
            <RefreshCw size={13} className={cn(status === 'checking' && 'animate-spin')} />
            {status === 'checking' ? 'Checking…' : 'Check again'}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  )
}
