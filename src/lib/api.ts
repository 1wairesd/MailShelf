import { Account, AccountFilters, AccountStats, CreateAccountInput, ImportExportResult, UpdateAccountInput } from '../types'

// Type-safe wrapper around the Electron IPC API exposed via preload
declare global {
  interface Window {
    api: {
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
      }
      accounts: {
        getAll: (filters?: AccountFilters) => Promise<Account[]>
        getById: (id: string) => Promise<Account | null>
        create: (input: CreateAccountInput) => Promise<Account>
        update: (id: string, input: UpdateAccountInput) => Promise<Account | null>
        delete: (id: string) => Promise<boolean>
        bulkDelete: (ids: string[]) => Promise<number>
        bulkUpdateStatus: (ids: string[], status: string) => Promise<number>
        getStats: () => Promise<AccountStats>
        getTags: () => Promise<string[]>
      }
      data: {
        export: () => Promise<ImportExportResult>
        import: () => Promise<ImportExportResult>
      }
    }
  }
}

// Lazy check — evaluated at call time, not at module load time
function getApi() {
  if (typeof window === 'undefined' || !window.api) {
    throw new Error(
      '[MailShelf] window.api is not available. ' +
      'Make sure the app is running inside Electron with the preload script loaded.'
    )
  }
  return window.api
}

export const api = {
  window: {
    minimize: () => {
      try { getApi().window.minimize() } catch (e) { console.warn(e) }
    },
    maximize: () => {
      try { getApi().window.maximize() } catch (e) { console.warn(e) }
    },
    close: () => {
      try { getApi().window.close() } catch (e) { console.warn(e) }
    },
    isMaximized: (): Promise<boolean> => {
      try { return getApi().window.isMaximized() } catch { return Promise.resolve(false) }
    },
  },
  accounts: {
    getAll: (filters?: AccountFilters) => getApi().accounts.getAll(filters),
    getById: (id: string) => getApi().accounts.getById(id),
    create: (input: CreateAccountInput) => getApi().accounts.create(input),
    update: (id: string, input: UpdateAccountInput) => getApi().accounts.update(id, input),
    delete: (id: string) => getApi().accounts.delete(id),
    bulkDelete: (ids: string[]) => getApi().accounts.bulkDelete(ids),
    bulkUpdateStatus: (ids: string[], status: string) => getApi().accounts.bulkUpdateStatus(ids, status),
    getStats: () => getApi().accounts.getStats(),
    getTags: () => getApi().accounts.getTags(),
  },
  data: {
    export: () => getApi().data.export(),
    import: () => getApi().data.import(),
  },
}
