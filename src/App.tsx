import React, { useEffect, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { SearchBar } from './components/SearchBar'
import { AccountList } from './components/AccountList'
import { AccountDetail } from './components/AccountDetail'
import { AccountForm } from './components/AccountForm'
import { BulkActionBar } from './components/BulkActionBar'
import { ShortcutsModal } from './components/ShortcutsModal'
import { ToastProvider } from './components/ui/toast'
import { useAccountStore } from './store/accountStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function AppContent() {
  const { loadAccounts, loadStats, loadTags, activeAccountId } = useAccountStore()
  const [showShortcuts, setShowShortcuts] = useState(false)

  useKeyboardShortcuts(() => setShowShortcuts(true))

  useEffect(() => {
    // Diagnostic: check if preload is loaded
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
  }, [])

  return (
    <div className="flex flex-col h-screen bg-shelf-bg text-shelf-text overflow-hidden">
      {/* Title bar */}
      <TitleBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Center: list + toolbar */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Toolbar onShowShortcuts={() => setShowShortcuts(true)} />
          <SearchBar />
          <BulkActionBar />
          <AccountList />
        </div>

        {/* Right: detail panel — only when account selected */}
        {activeAccountId && <AccountDetail />}
      </div>

      {/* Modals */}
      <AccountForm />
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
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
