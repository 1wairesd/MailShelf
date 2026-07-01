import React, { useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAccountStore } from '@/store/accountStore'
import { AccountCard } from './AccountCard'
import { Loader2, Inbox } from 'lucide-react'
import { Account } from '@/types'

export function AccountList() {
  const accounts  = useAccountStore(s => s.accounts)
  const isLoading = useAccountStore(s => s.isLoading)

  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: accounts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 104,
    overscan: 10,
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="text-shelf-text-subtle animate-spin" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
        <div className="w-12 h-12 rounded-xl bg-shelf-elevated flex items-center justify-center">
          <Inbox size={22} className="text-shelf-text-subtle" />
        </div>
        <div>
          <p className="text-sm font-medium text-shelf-text-muted">No accounts found</p>
          <p className="text-xs text-shelf-text-subtle mt-1">
            Add your first account or adjust your filters
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto overflow-x-hidden"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const account = accounts[virtualRow.index]
          return (
            <div
              key={account.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <AccountCardRow account={account} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Separate component so each row subscribes only to its own selection state
const AccountCardRow = React.memo(function AccountCardRow({ account }: { account: Account }) {
  const isSelected       = useAccountStore(s => s.selectedIds.has(account.id))
  const isActive         = useAccountStore(s => s.activeAccountId === account.id)
  const toggleSelect     = useAccountStore(s => s.toggleSelect)
  const setActiveAccount = useAccountStore(s => s.setActiveAccount)

  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSelect(account.id)
  }, [account.id, toggleSelect])

  const handleClick = useCallback(() => {
    const cur = useAccountStore.getState().activeAccountId
    setActiveAccount(cur === account.id ? null : account.id)
  }, [account.id, setActiveAccount])

  return (
    <AccountCard
      account={account}
      isSelected={isSelected}
      isActive={isActive}
      onSelect={handleSelect}
      onClick={handleClick}
    />
  )
})
