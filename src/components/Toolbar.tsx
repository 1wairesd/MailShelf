import React from 'react'
import { Plus, Keyboard } from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { Button } from './ui/button'
import { Tooltip } from './ui/tooltip'

interface ToolbarProps {
  onShowShortcuts: () => void
}

export function Toolbar({ onShowShortcuts }: ToolbarProps) {
  const { openCreateForm, accounts } = useAccountStore()

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-shelf-border bg-shelf-bg shrink-0">
      {/* Left: count */}
      <span className="text-xs text-shelf-text-subtle">
        {accounts.length} account{accounts.length !== 1 ? 's' : ''}
      </span>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
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
  )
}
