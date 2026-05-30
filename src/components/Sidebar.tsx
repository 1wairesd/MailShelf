import React from 'react'
import {
  Inbox,
  CheckCircle,
  Battery,
  Clock,
  Skull,
  Archive,
  BarChart2,
  Download,
  Upload,
  Hash,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { useTagRulesStore } from '@/store/tagRulesStore'
import { AccountStatus, STATUS_CONFIG } from '@/types'
import { useToast } from './ui/toast'

const STATUS_ITEMS: { status: AccountStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { status: 'all', label: 'All Accounts', icon: <Inbox size={15} /> },
  { status: 'active', label: 'Active', icon: <CheckCircle size={15} /> },
  { status: 'exhausted', label: 'Exhausted', icon: <Battery size={15} /> },
  { status: 'waiting-reset', label: 'Waiting Reset', icon: <Clock size={15} /> },
  { status: 'dead', label: 'Dead', icon: <Skull size={15} /> },
  { status: 'archived', label: 'Archived', icon: <Archive size={15} /> },
]

export function Sidebar({ onOpenTagRules }: { onOpenTagRules: () => void }) {
  const {
    stats,
    filters,
    allTags,
    accounts,
    setStatusFilter,
    setTagFilter,
    exportData,
    importData,
  } = useAccountStore()
  const { rules } = useTagRulesStore()
  const { toast } = useToast()
  const enabledRulesCount = rules.filter(r => r.enabled).length

  const [appVersion, setAppVersion] = React.useState<string>('')

  React.useEffect(() => {
    window.api.app.getVersion().then((v: string) => setAppVersion(`v${v}`)).catch(() => {})
  }, [])

  // Load rules once so the badge count is accurate
  React.useEffect(() => {
    useTagRulesStore.getState().loadRules()
  }, [])

  const activeTagFilters = filters.tags ?? []

  // Count accounts per tag — memoized to avoid recalculating on every render
  const tagCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const account of accounts) {
      for (const tag of account.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1
      }
    }
    return counts
  }, [accounts])

  const handleExport = async () => {
    const result = await exportData()
    if (result.success) {
      toast(`Exported ${result.count ?? 0} account${result.count !== 1 ? 's' : ''}`, 'success')
    }
    // cancelled — no toast
  }

  const handleImport = async () => {
    const result = await importData()
    if (result.success) {
      toast(`Imported ${result.count ?? 0} account${result.count !== 1 ? 's' : ''}`, 'success')
    }
    // cancelled — no toast
  }

  const toggleTag = (tag: string) => {
    if (activeTagFilters.includes(tag)) {
      setTagFilter(activeTagFilters.filter(t => t !== tag))
    } else {
      setTagFilter([...activeTagFilters, tag])
    }
  }

  const getCount = (status: AccountStatus | 'all') => {
    if (status === 'all') return stats.total
    return stats[status] ?? 0
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-shelf-bg border-r border-shelf-border overflow-hidden">
      {/* Stats header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-shelf-elevated/50">
          <BarChart2 size={13} className="text-shelf-accent" />
          <span className="text-xs text-shelf-text-muted font-medium">
            {stats.total} account{stats.total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Status filters */}
      <div className="px-3 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle px-2 mb-1">
          Status
        </p>
        <nav className="flex flex-col gap-0.5">
          {STATUS_ITEMS.map(item => {
            const isActive = filters.status === item.status
            const count = getCount(item.status)
            const config = item.status !== 'all' ? STATUS_CONFIG[item.status] : null

            return (
              <button
                key={item.status}
                onClick={() => setStatusFilter(item.status)}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all duration-100 text-left w-full group',
                  isActive
                    ? 'bg-shelf-accent/15 text-shelf-accent'
                    : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
                )}
              >
                <span className={cn(
                  'transition-colors',
                  isActive ? 'text-shelf-accent' : 'text-shelf-text-subtle group-hover:text-shelf-text-muted'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-medium tabular-nums',
                    isActive ? 'text-shelf-accent' : 'text-shelf-text-subtle'
                  )}>
                    {count}
                  </span>
                )}
                {config && isActive && (
                  <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="px-3 py-2 mt-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle px-2 mb-1">
            Tags
          </p>
          <div className="flex flex-col gap-0.5">
            {allTags.map(tag => {
              const isActive = activeTagFilters.includes(tag)
              const count = tagCounts[tag] ?? 0
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-100 text-left w-full group',
                    isActive
                      ? 'bg-shelf-accent/15 text-shelf-accent'
                      : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
                  )}
                >
                  <Hash size={12} className="shrink-0" />
                  <span className="truncate flex-1">{tag}</span>
                  {count > 0 && (
                    <span className={cn(
                      'text-[10px] font-medium tabular-nums',
                      isActive ? 'text-shelf-accent' : 'text-shelf-text-subtle'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Import/Export */}
      <div className="px-3 py-3 border-t border-shelf-border">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle px-2 mb-1.5">
          Data
        </p>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onOpenTagRules}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text transition-colors"
          >
            <Zap size={14} className="shrink-0" />
            <span>Tag Rules</span>
            {enabledRulesCount > 0 && (
              <span className="ml-auto text-[10px] font-medium tabular-nums bg-shelf-accent/20 text-shelf-accent px-1.5 py-0.5 rounded-full">
                {enabledRulesCount}
              </span>
            )}
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text transition-colors"
          >
            <Upload size={14} />
            <span>Import JSON</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text transition-colors"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Version */}
      {appVersion && (
        <div className="px-5 pb-3">
          <span className="text-[10px] text-shelf-text-subtle tabular-nums">{appVersion}</span>
        </div>
      )}
    </aside>
  )
}
