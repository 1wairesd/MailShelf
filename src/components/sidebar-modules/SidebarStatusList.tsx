import React from 'react'
import { Inbox, CheckCircle, Battery, Clock, Skull, Archive, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { AccountStatus } from '@/types'

const STATUS_ITEMS: { status: AccountStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { status: 'all',           label: 'All Accounts',  icon: <Inbox size={15} /> },
  { status: 'active',        label: 'Active',         icon: <CheckCircle size={15} /> },
  { status: 'exhausted',     label: 'Exhausted',      icon: <Battery size={15} /> },
  { status: 'waiting-reset', label: 'Waiting Reset',  icon: <Clock size={15} /> },
  { status: 'dead',          label: 'Dead',           icon: <Skull size={15} /> },
  { status: 'archived',      label: 'Archived',       icon: <Archive size={15} /> },
]

export function SidebarStatusList() {
  const stats   = useAccountStore(s => s.stats)
  const filters = useAccountStore(s => s.filters)
  const { setStatusFilter } = useAccountStore.getState()

  const getCount = (status: AccountStatus | 'all') =>
    status === 'all' ? stats.total : (stats[status] ?? 0)

  return (
    <div className="px-3 py-1">
      {/* Stats header */}
      <div className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded-md bg-shelf-elevated/50">
        <BarChart2 size={13} className="text-shelf-accent" />
        <span className="text-xs text-shelf-text-muted font-medium">
          {stats.total} account{stats.total !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle px-2 mb-1">
        Status
      </p>
      <nav className="flex flex-col gap-0.5">
        {STATUS_ITEMS.map(item => {
          const isActive = filters.status === item.status
          const count    = getCount(item.status)
          return (
            <button
              key={item.status}
              onClick={() => setStatusFilter(item.status)}
              className={cn(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all duration-100 text-left w-full group',
                isActive
                  ? 'bg-shelf-accent/15 text-shelf-accent hover:bg-shelf-accent/25'
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
            </button>
          )
        })}
      </nav>
    </div>
  )
}
