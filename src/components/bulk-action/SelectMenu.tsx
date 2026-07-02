import { createPortal } from 'react-dom'
import { CheckSquare, ChevronDown, ListFilter, Activity, Hash, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccountStatus, STATUS_CONFIG, PROVIDER_OPTIONS } from '@/types'
import { useDropdownPortal } from './useDropdownPortal'

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  dotColor: cfg.dotColor,
}))

interface Props {
  accounts: import('@/types').Account[]
  allTags: string[]
  providers: string[]
  totalCount: number
  onSelectAll: () => void
  onSelectByTag: (tag: string) => void
  onSelectByStatus: (status: AccountStatus) => void
  onSelectByProvider: (provider: string) => void
}

export function SelectMenu({
  allTags, providers, totalCount,
  onSelectAll, onSelectByTag, onSelectByStatus, onSelectByProvider,
}: Props) {
  const { triggerRef, open, setOpen, rect } = useDropdownPortal('select-menu-portal')

  const providerLabel = (p: string) =>
    PROVIDER_OPTIONS.find(o => o.value === p)?.label ?? p

  const pick = (fn: () => void) => { fn(); setOpen(false) }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0',
          open
            ? 'bg-shelf-accent/20 text-shelf-accent'
            : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
        )}
        title="Smart select"
      >
        <ListFilter size={13} />
        Select
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <div
          id="select-menu-portal"
          style={{
            position: 'fixed', zIndex: 9999,
            ...(rect ? { left: rect.left, top: rect.bottom + 4, minWidth: 220 } : { display: 'none' }),
          }}
        >
          <div className="rounded-md border border-shelf-border bg-shelf-surface shadow-lg overflow-hidden py-1">
            <button
              onMouseDown={e => { e.preventDefault(); pick(onSelectAll) }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
            >
              <CheckSquare size={13} className="shrink-0 text-shelf-accent" />
              <span>Select all</span>
              <span className="ml-auto text-[10px] text-shelf-text-subtle tabular-nums">{totalCount}</span>
            </button>

            <SectionHeader icon={<Activity size={9} />} label="By status" />
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onMouseDown={e => { e.preventDefault(); pick(() => onSelectByStatus(s.value as AccountStatus)) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', s.dotColor)} />
                <span>{s.label}</span>
              </button>
            ))}

            {allTags.length > 0 && (
              <>
                <SectionHeader icon={<Hash size={9} />} label="By tag" divider />
                <div className="max-h-36 overflow-y-auto">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onMouseDown={e => { e.preventDefault(); pick(() => onSelectByTag(tag)) }}
                      className="w-full flex items-center gap-2 px-3 py-1 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
                    >
                      <Hash size={10} className="shrink-0 text-shelf-text-subtle" />
                      <span className="truncate">{tag}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {providers.length > 1 && (
              <>
                <SectionHeader icon={<Globe size={9} />} label="By provider" divider />
                {providers.map(p => (
                  <button
                    key={p}
                    onMouseDown={e => { e.preventDefault(); pick(() => onSelectByProvider(p)) }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-shelf-elevated text-shelf-text-muted hover:text-shelf-text transition-colors"
                  >
                    <span className="text-xs text-shelf-text-subtle bg-shelf-elevated px-1.5 py-0.5 rounded shrink-0">
                      {providerLabel(p)}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function SectionHeader({ icon, label, divider }: { icon: React.ReactNode; label: string; divider?: boolean }) {
  return (
    <div className={cn('px-3 py-1 mt-0.5', divider && 'border-t border-shelf-border/40 pt-1.5')}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle flex items-center gap-1.5">
        {icon}{label}
      </p>
    </div>
  )
}
