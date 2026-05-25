import React, { useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountStore } from '@/store/accountStore'
import { Select } from './ui/select'
import { SortField, SortOrder, PROVIDER_OPTIONS } from '@/types'

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
  } = useAccountStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
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
    (filters.status && filters.status !== 'all') ||
    (filters.provider && filters.provider !== '') ||
    (filters.tags && filters.tags.length > 0)

  const showCount = hasActiveFilters
  const resultCount = accounts.length
  const totalCount = stats.total

  return (
    <div className="flex flex-col gap-0 border-b border-shelf-border bg-shelf-bg shrink-0">
      {/* Search row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-shelf-text-subtle pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email, notes, or tags… (Ctrl+F)"
            className={cn(
              'w-full h-8 bg-shelf-surface border border-shelf-border rounded-md pl-8 pr-8 text-sm text-shelf-text placeholder:text-shelf-text-subtle',
              'focus:outline-none focus:ring-1 focus:ring-shelf-accent focus:border-shelf-accent transition-colors'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-shelf-text-subtle hover:text-shelf-text transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 shrink-0">
          <SlidersHorizontal size={13} className="text-shelf-text-subtle" />
          <Select
            value={filters.sortBy ?? 'created_at'}
            onChange={v => setSortBy(v as SortField)}
            options={SORT_OPTIONS}
            className="w-36"
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
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 px-4 pb-2">
        {/* Provider filter */}
        <Select
          value={filters.provider ?? ''}
          onChange={v => setProviderFilter(v)}
          options={PROVIDER_FILTER_OPTIONS}
          className="w-36"
        />

        {/* Result count */}
        {showCount && (
          <span className="text-xs text-shelf-text-subtle ml-1">
            {resultCount} of {totalCount}
          </span>
        )}

        <div className="flex-1" />

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-shelf-text-muted hover:text-shelf-text transition-colors px-2 py-1 rounded hover:bg-shelf-elevated"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
