import { createPortal } from 'react-dom'
import { Folder, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Group } from '@/types'
import { useDropdownPortal } from './useDropdownPortal'

interface Props {
  groups: Group[]
  onMove: (groupId: string | null) => void
}

export function GroupBulkMenu({ groups, onMove }: Props) {
  const { triggerRef, open, setOpen, rect } = useDropdownPortal('bulk-group-portal')

  const pick = (groupId: string | null) => { onMove(groupId); setOpen(false) }

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
        <Folder size={13} />
        Group
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <div
          id="bulk-group-portal"
          style={{
            position: 'fixed', zIndex: 9999,
            ...(rect ? { left: rect.right - 200, top: rect.bottom + 4, width: 200 } : { display: 'none' }),
          }}
        >
          <div className="rounded-md border border-shelf-border bg-shelf-surface shadow-lg overflow-hidden py-1">
            {groups.map(group => (
              <button
                key={group.id}
                onMouseDown={e => { e.preventDefault(); pick(group.id) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                <span className="truncate">{group.name}</span>
              </button>
            ))}
            <div className="border-t border-shelf-border/50 mt-1 pt-1">
              <button
                onMouseDown={e => { e.preventDefault(); pick(null) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-subtle hover:text-shelf-text transition-colors"
              >
                <Folder size={12} className="shrink-0" />
                <span>Remove from group</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
