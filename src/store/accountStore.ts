import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  Account,
  AccountFilters,
  AccountStats,
  AccountStatus,
  CreateAccountInput,
  SortField,
  SortOrder,
  UpdateAccountInput,
} from '../types'
import { api } from '../lib/api'
import { debounce } from '../lib/utils'

interface AccountStore {
  // Data
  accounts: Account[]
  stats: AccountStats
  allTags: string[]
  tagCounts: Record<string, number>
  isLoading: boolean
  error: string | null

  // Selection
  selectedIds: Set<string>
  activeAccountId: string | null

  // Filters
  filters: AccountFilters

  // UI state
  isFormOpen: boolean
  editingAccount: Account | null
  searchQuery: string

  // Actions
  loadAccounts: () => Promise<void>
  loadStats: () => Promise<void>
  loadTags: () => Promise<void>
  loadTagCounts: () => Promise<void>
  createAccount: (input: CreateAccountInput) => Promise<Account | null>
  updateAccount: (id: string, input: UpdateAccountInput) => Promise<Account | null>
  deleteAccount: (id: string) => Promise<boolean>
  touchAccount: (id: string) => Promise<void>
  duplicateAccount: (id: string) => Promise<Account | null>
  bulkDelete: (ids: string[]) => Promise<void>
  bulkUpdateStatus: (ids: string[], status: AccountStatus) => Promise<void>
  bulkUpdateTag: (ids: string[], tag: string, mode: 'add' | 'remove') => Promise<void>

  // Filter actions
  setSearch: (query: string) => void
  setStatusFilter: (status: AccountStatus | 'all') => void
  setProviderFilter: (provider: string) => void
  setTagFilter: (tags: string[]) => void
  setGroupFilter: (groupId: string | null) => void
  setSortBy: (field: SortField) => void
  setSortOrder: (order: SortOrder) => void
  resetFilters: () => void

  // Selection actions
  selectAccount: (id: string) => void
  deselectAccount: (id: string) => void
  toggleSelect: (id: string) => void
  selectAll: () => void
  selectByTag: (tag: string) => void
  selectByStatus: (status: AccountStatus) => void
  selectByProvider: (provider: string) => void
  clearSelection: () => void
  setActiveAccount: (id: string | null) => void

  // Form actions
  openCreateForm: () => void
  openEditForm: (account: Account) => void
  closeForm: () => void

  // Confirm delete (legacy — kept for compatibility, use showConfirm instead)
  confirmDeleteId: string | null
  setConfirmDeleteId: (id: string | null) => void

  // Universal confirm dialog
  confirmDialog: {
    open: boolean
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => void
  } | null
  showConfirm: (opts: {
    title: string
    description: string
    confirmLabel?: string
    onConfirm: () => void
  }) => void
  closeConfirm: () => void

  // Import/Export
  exportData: () => Promise<{ success: boolean; count?: number }>
  exportCSV: () => Promise<{ success: boolean; count?: number }>
  importData: () => Promise<{ success: boolean; count?: number }>
}

const defaultFilters: AccountFilters = {
  search: '',
  status: 'all',
  provider: '',
  tags: [],
  sortBy: 'created_at',
  sortOrder: 'desc',
}

// Debounced version of loadAccounts for search — prevents firing on every keystroke
const debouncedSearch = debounce((fn: () => void) => fn(), 150)

// Helper: patch a single account in local state without a full reload
function patchAccount(
  set: (fn: (state: { accounts: Account[] }) => Partial<{ accounts: Account[] }>) => void,
  id: string,
  partial: Partial<Account>
) {
  set(state => ({
    accounts: state.accounts.map(a => (a.id === id ? { ...a, ...partial } : a)),
  }))
}

export const useAccountStore = create<AccountStore>()(
  subscribeWithSelector((set, get) => ({
    accounts: [],
    stats: { total: 0, active: 0, exhausted: 0, 'waiting-reset': 0, dead: 0, archived: 0 },
    allTags: [],
    tagCounts: {},
    isLoading: false,
    error: null,
    selectedIds: new Set(),
    activeAccountId: null,
    filters: { ...defaultFilters },
    isFormOpen: false,
    editingAccount: null,
    searchQuery: '',
    confirmDeleteId: null,
    confirmDialog: null,

    loadAccounts: async () => {
      set({ isLoading: true, error: null })
      try {
        const accounts = await api.accounts.getAll(get().filters)
        set({ accounts, isLoading: false })
      } catch (err) {
        set({ error: String(err), isLoading: false })
      }
    },

    loadStats: async () => {
      try {
        const stats = await api.accounts.getStats()
        set({ stats })
      } catch (err) {
        console.error('Failed to load stats:', err)
      }
    },

    loadTags: async () => {
      try {
        const allTags = await api.accounts.getTags()
        set({ allTags })
        // Always refresh counts alongside tags
        get().loadTagCounts().catch(console.error)
      } catch (err) {
        console.error('Failed to load tags:', err)
      }
    },

    loadTagCounts: async () => {
      try {
        const tagCounts = await api.accounts.getTagCounts()
        set({ tagCounts })
      } catch (err) {
        console.error('Failed to load tag counts:', err)
      }
    },

    createAccount: async (input) => {
      try {
        const account = await api.accounts.create(input)
        // If currently filtering by a group, auto-add the new account to it
        const activeGroupId = get().filters.groupId
        if (activeGroupId && account?.id) {
          try {
            await api.groups.addAccounts(activeGroupId, [account.id])
          } catch (e) {
            console.warn('[store] auto-add to group failed:', e)
          }
        }
        // Reload independently — don't let reload failure break create
        get().loadAccounts().catch(e => console.error('[store] loadAccounts after create failed:', e))
        get().loadStats().catch(e => console.error('[store] loadStats after create failed:', e))
        get().loadTags().catch(e => console.error('[store] loadTags after create failed:', e))
        return account
      } catch (err) {
        console.error('[store] createAccount failed:', err)
        set({ error: String(err) })
        return null
      }
    },

    updateAccount: async (id, input) => {
      try {
        const account = await api.accounts.update(id, input)
        // Patch local state immediately — panel reflects the change without waiting for reload
        patchAccount(set, id, { ...input, ...account })
        // Stats counters depend on status — refresh them in the background
        get().loadStats().catch(e => console.error('[store] loadStats after update failed:', e))
        // Tags list may have changed if tags were edited
        if (input.tags) {
          get().loadTags().catch(e => console.error('[store] loadTags after update failed:', e))
        }
        return account
      } catch (err) {
        console.error('[store] updateAccount failed:', err)
        set({ error: String(err) })
        return null
      }
    },

    // Silent update — only patches last_used_at in DB and local state, no list reload
    touchAccount: async (id) => {
      try {
        const now = new Date().toISOString()
        await api.accounts.update(id, { last_used_at: now })
        patchAccount(set, id, { last_used_at: now })
      } catch (err) {
        console.error('[store] touchAccount failed:', err)
      }
    },

    deleteAccount: async (id) => {
      try {
        const success = await api.accounts.delete(id)
        if (success) {
          const { activeAccountId, selectedIds } = get()
          const newSelected = new Set(selectedIds)
          newSelected.delete(id)
          set({
            selectedIds: newSelected,
            activeAccountId: activeAccountId === id ? null : activeAccountId,
            confirmDeleteId: null,
          })
          await get().loadAccounts()
          await get().loadStats()
          await get().loadTags()
        }
        return success
      } catch (err) {
        set({ error: String(err) })
        return false
      }
    },

    duplicateAccount: async (id) => {
      try {
        const source = get().accounts.find(a => a.id === id)
        if (!source) return null
        const account = await api.accounts.create({
          email: source.email.replace(/^/, 'copy-'),
          password: source.password,
          provider: source.provider,
          notes: source.notes,
          tags: [...source.tags],
          status: source.status,
        })
        get().loadAccounts().catch(console.error)
        get().loadStats().catch(console.error)
        return account
      } catch (err) {
        console.error('[store] duplicateAccount failed:', err)
        set({ error: String(err) })
        return null
      }
    },

    bulkDelete: async (ids) => {
      try {
        await api.accounts.bulkDelete(ids)
        const { activeAccountId } = get()
        set({
          selectedIds: new Set(),
          activeAccountId: ids.includes(activeAccountId ?? '') ? null : activeAccountId,
        })
        await get().loadAccounts()
        await get().loadStats()
        await get().loadTags()
      } catch (err) {
        set({ error: String(err) })
      }
    },

    bulkUpdateStatus: async (ids, status) => {
      try {
        await api.accounts.bulkUpdateStatus(ids, status)
        set({ selectedIds: new Set() })
        await get().loadAccounts()
        await get().loadStats()
      } catch (err) {
        set({ error: String(err) })
      }
    },

    bulkUpdateTag: async (ids, tag, mode) => {
      try {
        await api.accounts.bulkUpdateTag(ids, tag, mode)
        await get().loadAccounts()
        await get().loadTags()
      } catch (err) {
        set({ error: String(err) })
      }
    },

    setSearch: (query) => {
      set(state => ({ filters: { ...state.filters, search: query }, searchQuery: query }))
      debouncedSearch(() => get().loadAccounts())
    },

    setStatusFilter: (status) => {
      set(state => ({ filters: { ...state.filters, status } }))
      get().loadAccounts()
    },

    setProviderFilter: (provider) => {
      set(state => ({ filters: { ...state.filters, provider } }))
      get().loadAccounts()
    },

    setTagFilter: (tags) => {
      set(state => ({ filters: { ...state.filters, tags } }))
      get().loadAccounts()
    },

    setGroupFilter: (groupId) => {
      set(state => ({ filters: { ...state.filters, groupId } }))
      get().loadAccounts()
    },

    setSortBy: (sortBy) => {
      set(state => ({ filters: { ...state.filters, sortBy } }))
      get().loadAccounts()
    },

    setSortOrder: (sortOrder) => {
      set(state => ({ filters: { ...state.filters, sortOrder } }))
      get().loadAccounts()
    },

    resetFilters: () => {
      set({ filters: { ...defaultFilters }, searchQuery: '' })
      get().loadAccounts()
    },

    selectAccount: (id) => {
      set(state => {
        const newSet = new Set(state.selectedIds)
        newSet.add(id)
        return { selectedIds: newSet }
      })
    },

    deselectAccount: (id) => {
      set(state => {
        const newSet = new Set(state.selectedIds)
        newSet.delete(id)
        return { selectedIds: newSet }
      })
    },

    toggleSelect: (id) => {
      const { selectedIds } = get()
      if (selectedIds.has(id)) {
        get().deselectAccount(id)
      } else {
        get().selectAccount(id)
      }
    },

    selectAll: () => {
      const { accounts } = get()
      set({ selectedIds: new Set(accounts.map(a => a.id)) })
    },

    selectByTag: (tag) => {
      const { accounts, selectedIds } = get()
      const matching = accounts.filter(a => a.tags.includes(tag)).map(a => a.id)
      const merged = new Set([...selectedIds, ...matching])
      set({ selectedIds: merged })
    },

    selectByStatus: (status) => {
      const { accounts, selectedIds } = get()
      const matching = accounts.filter(a => a.status === status).map(a => a.id)
      const merged = new Set([...selectedIds, ...matching])
      set({ selectedIds: merged })
    },

    selectByProvider: (provider) => {
      const { accounts, selectedIds } = get()
      const matching = accounts.filter(a => a.provider === provider).map(a => a.id)
      const merged = new Set([...selectedIds, ...matching])
      set({ selectedIds: merged })
    },

    clearSelection: () => {
      set({ selectedIds: new Set() })
    },

    setActiveAccount: (id) => {
      set({ activeAccountId: id })
    },

    openCreateForm: () => {
      set({ isFormOpen: true, editingAccount: null })
    },

    openEditForm: (account) => {
      set({ isFormOpen: true, editingAccount: account })
    },

    closeForm: () => {
      set({ isFormOpen: false, editingAccount: null })
    },

    setConfirmDeleteId: (id) => {
      set({ confirmDeleteId: id })
    },

    showConfirm: (opts) => {
      set({
        confirmDialog: {
          open: true,
          title: opts.title,
          description: opts.description,
          confirmLabel: opts.confirmLabel ?? 'Delete',
          onConfirm: opts.onConfirm,
        },
      })
    },

    closeConfirm: () => {
      set({ confirmDialog: null })
    },

    exportData: async () => {
      try {
        const result = await api.data.export()
        return result
      } catch (err) {
        set({ error: String(err) })
        return { success: false }
      }
    },

    exportCSV: async () => {
      try {
        const result = await api.data.exportCSV()
        return result
      } catch (err) {
        set({ error: String(err) })
        return { success: false }
      }
    },

    importData: async () => {
      try {
        const result = await api.data.import()
        if (result.success) {
          await get().loadAccounts()
          await get().loadStats()
          await get().loadTags()
        }
        return result
      } catch (err) {
        set({ error: String(err) })
        return { success: false }
      }
    },
  }))
)
