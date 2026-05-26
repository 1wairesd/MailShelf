import { useEffect, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { SearchBar } from './components/SearchBar'
import { AccountList } from './components/AccountList'
import { AccountDetail } from './components/AccountDetail'
import { AccountForm } from './components/AccountForm'
import { ConfirmDialog } from './components/ConfirmDialog'
import { BulkActionBar } from './components/BulkActionBar'
import { ShortcutsModal } from './components/ShortcutsModal'
import { TagRulesModal } from './components/TagRulesModal'
import { ToastProvider, useToast } from './components/ui/toast'
import { useAccountStore } from './store/accountStore'
import { useTagRulesStore } from './store/tagRulesStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { api } from './lib/api'

function AppContent() {
  const { loadAccounts, loadStats, loadTags, activeAccountId } = useAccountStore()
  const { setLastRunResults } = useTagRulesStore()
  const { toast } = useToast()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showTagRules, setShowTagRules] = useState(false)

  useKeyboardShortcuts(() => setShowShortcuts(true))

  useEffect(() => {
    if (typeof window.api === 'undefined') {
      console.error(
        '[MailShelf] window.api is UNDEFINED.\n' +
        'Preload script did not load. Check:\n' +
        '1. dist-electron/preload.js exists\n' +
        '2. Electron was started AFTER tsc compiled preload.ts\n' +
        '3. sandbox: false is set in webPreferences'
      )
      return
    }
    console.log('[MailShelf] window.api loaded OK:', Object.keys(window.api))
    loadAccounts()
    loadStats()
    loadTags()

    // Listen for scheduler-triggered rule applications
    const unsub = api.tagRules.onApplied(({ results, totalAffected }) => {
      setLastRunResults(results)
      loadAccounts()
      loadStats()
      if (totalAffected > 0) {
        toast(`Tag rules applied: ${totalAffected} account${totalAffected !== 1 ? 's' : ''} updated`, 'success')
      }
    })
    return () => unsub()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-shelf-bg text-shelf-text overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onOpenTagRules={() => setShowTagRules(true)} />

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Toolbar onShowShortcuts={() => setShowShortcuts(true)} />
          <SearchBar />
          <BulkActionBar />
          <AccountList />
        </div>

        {activeAccountId && <AccountDetail />}
      </div>

      <AccountForm />
      <ConfirmDialog />
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <TagRulesModal open={showTagRules} onClose={() => setShowTagRules(false)} />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
