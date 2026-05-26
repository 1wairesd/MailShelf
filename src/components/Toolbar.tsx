import { useState } from 'react'
import { Plus, Keyboard, ArrowUpCircle } from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { Button } from './ui/button'
import { Tooltip } from './ui/tooltip'
import { UpdateModal } from './UpdateModal'
import { useUpdateCheck } from '@/hooks/useUpdateCheck'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  onShowShortcuts: () => void
}

export function Toolbar({ onShowShortcuts }: ToolbarProps) {
  const { openCreateForm, accounts } = useAccountStore()
  const [updateOpen, setUpdateOpen] = useState(false)
  const { status, info, check, install } = useUpdateCheck()

  const hasUpdate = status === 'downloaded' || status === 'available' || status === 'downloading'

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-shelf-border bg-shelf-bg shrink-0">
        {/* Left: count */}
        <span className="text-xs text-shelf-text-subtle">
          {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </span>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {/* Update indicator */}
          <Tooltip content={
            status === 'downloaded' ? `v${info.version} ready — click to install` :
            status === 'downloading' ? `Downloading update… ${info.percent ?? 0}%` :
            status === 'available' ? `Update available: v${info.version}` :
            'Check for updates'
          }>
            <button
              onClick={() => setUpdateOpen(true)}
              className={cn(
                'relative p-1.5 rounded-md transition-colors',
                hasUpdate
                  ? 'text-shelf-accent hover:bg-shelf-accent/10'
                  : 'text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated'
              )}
            >
              <ArrowUpCircle size={14} />
              {hasUpdate && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-shelf-accent" />
              )}
            </button>
          </Tooltip>

          <Tooltip content="Keyboard shortcuts (?)">
            <Button variant="ghost" size="icon-sm" onClick={onShowShortcuts}>
              <Keyboard size={14} />
            </Button>
          </Tooltip>

          <Button
            variant="default"
            size="sm"
            onClick={openCreateForm}
            className="gap-1.5 ml-1"
          >
            <Plus size={14} />
            Add Account
          </Button>
        </div>
      </div>

      <UpdateModal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        status={status}
        info={info}
        onCheck={check}
        onInstall={install}
      />
    </>
  )
}
