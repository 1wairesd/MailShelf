import { Account, AccountFilters, AccountStats, CreateAccountInput, ImportExportResult, UpdateAccountInput } from '../types'
import type { TagRule, CreateTagRuleInput, UpdateTagRuleInput, TagRuleRunResult } from '../../shared/types'

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
        bulkUpdateTag: (ids: string[], tag: string, mode: 'add' | 'remove') => Promise<number>
        getStats: () => Promise<AccountStats>
        getTags: () => Promise<string[]>
      }
      tagRules: {
        getAll: () => Promise<TagRule[]>
        create: (input: CreateTagRuleInput) => Promise<TagRule>
        update: (id: string, input: UpdateTagRuleInput) => Promise<TagRule | null>
        delete: (id: string) => Promise<boolean>
        run: () => Promise<TagRuleRunResult[]>
        onApplied: (cb: (data: { results: TagRuleRunResult[]; totalAffected: number }) => void) => () => void
      }
      data: {
        export: () => Promise<ImportExportResult>
        import: () => Promise<ImportExportResult>
      }
      app: {
        checkForUpdates: () => Promise<{
          hasUpdate: boolean
          currentVersion: string
          latestVersion?: string
          releaseUrl?: string
          error?: string
        }>
        getVersion: () => Promise<string>
        openExternal: (url: string) => Promise<void>
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
    bulkUpdateTag: (ids: string[], tag: string, mode: 'add' | 'remove') => getApi().accounts.bulkUpdateTag(ids, tag, mode),
    getStats: () => getApi().accounts.getStats(),
    getTags: () => getApi().accounts.getTags(),
  },
  tagRules: {
    getAll: () => getApi().tagRules.getAll(),
    create: (input: CreateTagRuleInput) => getApi().tagRules.create(input),
    update: (id: string, input: UpdateTagRuleInput) => getApi().tagRules.update(id, input),
    delete: (id: string) => getApi().tagRules.delete(id),
    run: () => getApi().tagRules.run(),
    onApplied: (cb: Parameters<Window['api']['tagRules']['onApplied']>[0]) =>
      getApi().tagRules.onApplied(cb),
  },
  data: {
    export: () => getApi().data.export(),
    import: () => getApi().data.import(),
  },
  app: {
    checkForUpdates: () => getApi().app.checkForUpdates(),
    getVersion: () => getApi().app.getVersion(),
    openExternal: (url: string) => getApi().app.openExternal(url),
  },
}
