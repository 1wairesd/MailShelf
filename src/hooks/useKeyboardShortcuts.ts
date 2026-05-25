import { useEffect } from 'react'
import { useAccountStore } from '@/store/accountStore'
import { copyToClipboard } from '@/lib/utils'

export function useKeyboardShortcuts(onShowShortcuts: () => void) {
  const store = useAccountStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // ? — show shortcuts (not in input)
      if (e.key === '?' && !isInput) {
        e.preventDefault()
        onShowShortcuts()
        return
      }

      // Cmd/Ctrl+N — new account
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        store.openCreateForm()
        return
      }

      // Cmd/Ctrl+A — select all (not in input)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !isInput) {
        e.preventDefault()
        store.selectAll()
        return
      }

      // Escape — close form / clear selection / deselect active
      if (e.key === 'Escape') {
        if (store.isFormOpen) {
          store.closeForm()
          return
        }
        if (store.selectedIds.size > 0) {
          store.clearSelection()
          return
        }
        if (store.activeAccountId) {
          store.setActiveAccount(null)
          return
        }
      }

      // Cmd/Ctrl+E — edit active account
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && !isInput) {
        e.preventDefault()
        const account = store.accounts.find(a => a.id === store.activeAccountId)
        if (account) store.openEditForm(account)
        return
      }

      // Delete/Backspace — delete active account (not in input)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        if (store.selectedIds.size > 0) {
          e.preventDefault()
          const ids = Array.from(store.selectedIds)
          store.showConfirm({
            title: `Delete ${ids.length} account${ids.length !== 1 ? 's' : ''}?`,
            description: `This will permanently delete ${ids.length} selected account${ids.length !== 1 ? 's' : ''}. This action cannot be undone.`,
            confirmLabel: `Delete ${ids.length}`,
            onConfirm: () => store.bulkDelete(ids),
          })
          return
        }
        if (store.activeAccountId) {
          e.preventDefault()
          const account = store.accounts.find(a => a.id === store.activeAccountId)
          if (account) {
            store.showConfirm({
              title: 'Delete account?',
              description: `This will permanently delete ${account.email}. This action cannot be undone.`,
              confirmLabel: 'Delete',
              onConfirm: () => store.deleteAccount(store.activeAccountId!),
            })
          }
          return
        }
      }

      // Space — toggle selection of active account (not in input)
      if (e.key === ' ' && !isInput && store.activeAccountId) {
        e.preventDefault()
        store.toggleSelect(store.activeAccountId)
        return
      }

      // Arrow keys — navigate accounts (not in input)
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isInput) {
        e.preventDefault()
        const { accounts, activeAccountId } = store
        if (accounts.length === 0) return
        const idx = accounts.findIndex(a => a.id === activeAccountId)
        if (e.key === 'ArrowDown') {
          const next = idx < accounts.length - 1 ? idx + 1 : 0
          store.setActiveAccount(accounts[next].id)
        } else {
          const prev = idx > 0 ? idx - 1 : accounts.length - 1
          store.setActiveAccount(accounts[prev].id)
        }
        return
      }

      // Cmd/Ctrl+C — copy email of active account (not in input)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !isInput && store.activeAccountId) {
        const account = store.accounts.find(a => a.id === store.activeAccountId)
        if (account) {
          e.preventDefault()
          copyToClipboard(account.email)
        }
        return
      }

      // Cmd/Ctrl+Shift+C — copy password
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C' && !isInput && store.activeAccountId) {
        const account = store.accounts.find(a => a.id === store.activeAccountId)
        if (account?.password) {
          e.preventDefault()
          copyToClipboard(account.password)
        }
        return
      }

      // Cmd/Ctrl+I — import
      if ((e.metaKey || e.ctrlKey) && e.key === 'i' && !isInput) {
        e.preventDefault()
        store.importData()
        return
      }

      // Cmd/Ctrl+Shift+E — export
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E' && !isInput) {
        e.preventDefault()
        store.exportData()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store, onShowShortcuts])
}
