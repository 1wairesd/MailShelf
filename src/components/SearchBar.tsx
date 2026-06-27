import { useRef, useEffect, useState } from 'react'
import { Search, X, SlidersHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { Select } from './ui/select'
import { SortField, SortOrder, PROVIDER_OPTIONS } from '@/types'
import { Tooltip } from './ui/tooltip'
import { Button } from './ui/button'

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'created_at',   label: 'Date Created' },
  { value: 'updated_at',   label: 'Date Updated' },
  { value: 'last_used_at', label: 'Last Used' },
  { value: 'status',       label: 'Status' },
  { value: 'email',        label: 'Email' },
]

const PROVIDER_FILTER_OPTIONS = [
  { value: '', label: 'All providers' },
  ...PROVIDER_OPTIONS,
]

export function SearchBar() {
  const {
    searchQuery, setSearch,
    filters, setSortBy, setSortOrder,
    setProviderFilter, resetFilters,
    accounts, stats,
    openCreateForm,
  } = useAccountStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyF') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur()
        if (searchQuery) setSearch('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchQuery, setSearch])

  const hasActiveFilters =
    searchQuery ||
    (filters.provider && filters.provider !== '') ||
    (filters.tags && filters.tags.length > 0)

  const hasNonSearchFilters =
    (filters.provider && filters.provider !== '') ||
    (filters.sortBy && filters.sortBy !== 'created_at') ||
    (filters.sortOrder && filters.sortOrder !== 'desc')

  const filtersOpen = showFilters || !!hasNonSearchFilters

  return (
    <div className="border-b border-shelf-border bg-shelf-bg shrink-0">
      {/* Single row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Left: search + filters */}
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative w-48 shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-shelf-text-subtle pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search… (Ctrl+F)"
              className={cn(
                'w-full h-7 bg-shelf-surface border border-shelf-border rounded-md pl-7 pr-7 text-xs text-shelf-text placeholder:text-shelf-text-subtle',
                'focus:outline-none focus:ring-1 focus:ring-shelf-accent focus:border-shelf-accent transition-colors'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-shelf-text-subtle hover:text-shelf-text transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Result count */}
          {hasActiveFilters && (
            <span className="text-[11px] text-shelf-text-subtle shrink-0 tabular-nums">
              {accounts.length}/{stats.total}
            </span>
          )}

          {/* Filters toggle */}
          <Tooltip content="Sort & filter">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={cn(
                'p-1.5 rounded-md transition-colors shrink-0',
                filtersOpen || hasNonSearchFilters
                  ? 'text-shelf-accent bg-shelf-accent/10'
                  : 'text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated'
              )}
            >
              <SlidersHorizontal size={13} />
            </button>
          </Tooltip>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-shelf-text-muted hover:text-shelf-text transition-colors px-1.5 py-1 rounded hover:bg-shelf-elevated shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="default"
            size="sm"
            onClick={openCreateForm}
            className="gap-1.5"
          >
            <Plus size={14} />
            Add Account
          </Button>
        </div>
      </div>

      {/* Expandable filter row */}
      {filtersOpen && (
        <div className="flex items-center gap-2 px-3 pb-2">
          <Select
            value={filters.provider ?? ''}
            onChange={v => setProviderFilter(v)}
            options={PROVIDER_FILTER_OPTIONS}
            className="w-32"
          />
          <Select
            value={filters.sortBy ?? 'created_at'}
            onChange={v => setSortBy(v as SortField)}
            options={SORT_OPTIONS}
            className="w-32"
          />
          <Select
            value={filters.sortOrder ?? 'desc'}
            onChange={v => setSortOrder(v as SortOrder)}
            options={[
              { value: 'desc', label: 'Newest' },
              { value: 'asc',  label: 'Oldest' },
            ]}
            className="w-24"
          />
        </div>
      )}
    </div>
  )
}
