import React from 'react'
import { Hash, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'

export function SidebarTagList() {
  const allTags   = useAccountStore(s => s.allTags)
  const tagCounts = useAccountStore(s => s.tagCounts)
  const filters   = useAccountStore(s => s.filters)
  const { setTagFilter } = useAccountStore.getState()

  const [collapsed, setCollapsed] = React.useState(false)

  const activeTagFilters = filters.tags ?? []

  const toggleTag = (tag: string) => {
    if (activeTagFilters.includes(tag)) {
      setTagFilter(activeTagFilters.filter(t => t !== tag))
    } else {
      setTagFilter([...activeTagFilters, tag])
    }
  }

  if (allTags.length === 0) return null

  return (
    <div className="px-3 py-2 mt-1">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-1 px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle hover:text-shelf-text-muted transition-colors w-full text-left"
      >
        <ChevronDown
          size={11}
          className={cn('transition-transform duration-150', collapsed && '-rotate-90')}
        />
        Tags
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-0.5">
          {allTags.map(tag => {
            const isActive = activeTagFilters.includes(tag)
            const count    = tagCounts[tag] ?? 0
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-100 text-left w-full group',
                  isActive
                    ? 'bg-shelf-accent/15 text-shelf-accent hover:bg-shelf-accent/25'
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
      )}
    </div>
  )
}
