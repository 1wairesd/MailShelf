import { Account, AccountFilters, AccountStats, CreateAccountInput, ImportExportResult, UpdateAccountInput } from '../types'
import type { TagRule, CreateTagRuleInput, UpdateTagRuleInput, TagRuleRunResult, Group, CreateGroupInput, UpdateGroupInput } from '../../shared/types'

// ─── AppSettings (mirrored from electron/settings.ts) ────────────────────────
export interface AppSettings {
  updates: {
    checkOnStartup: boolean
    autoDownload: boolean
    checkIntervalHours: 0 | 1 | 4 | 24
    channel: 'stable' | 'beta'
  }
  appearance: {
    theme: 'dark' | 'light' | 'system'
  }
}

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
        getTagCounts: () => Promise<Record<string, number>>
        getTagsAndCounts: () => Promise<{ allTags: string[]; tagCounts: Record<string, number> }>
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
        exportCSV: () => Promise<ImportExportResult>
        import: () => Promise<ImportExportResult>
      }
      groups: {
        getAll: () => Promise<Group[]>
        getCounts: () => Promise<Record<string, number>>
        create: (input: CreateGroupInput) => Promise<Group>
        update: (id: string, input: UpdateGroupInput) => Promise<Group | null>
        delete: (id: string) => Promise<boolean>
        addAccounts: (groupId: string, accountIds: string[]) => Promise<number>
        removeAccounts: (groupId: string, accountIds: string[]) => Promise<number>
        moveAccounts: (groupId: string | null, accountIds: string[]) => Promise<number>
        getAccountGroups: (accountId: string) => Promise<string[]>
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
      updater: {
        check: () => Promise<unknown>
        install: () => void
        onUpdateAvailable: (cb: (info: { version: string; releaseNotes?: string }) => void) => () => void
        onUpdateNotAvailable: (cb: () => void) => () => void
        onDownloadProgress: (cb: (p: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void
        onUpdateDownloaded: (cb: (info: { version: string }) => void) => () => void
        onError: (cb: (err: { message: string }) => void) => () => void
      }
      settings: {
        get: () => Promise<AppSettings>
        updateUpdates: (patch: Partial<AppSettings['updates']>) => Promise<AppSettings>
        updateAppearance: (patch: Partial<AppSettings['appearance']>) => Promise<AppSettings>
        applyUpdaterSettings: () => void
      }
    }
  }
}

// ─── API access ───────────────────────────────────────────────────────────────

function getApi() {
  if (typeof window === 'undefined' || !window.api) {
    throw new Error(
      '[MailShelf] window.api is not available. ' +
      'Make sure the app is running inside Electron with the preload script loaded.'
    )
  }
  return window.api
}

/**
 * Creates a proxy that lazily delegates to window.api[namespace].
 * This eliminates boilerplate passthrough methods — adding a new method
 * in preload.ts automatically makes it available here without extra wiring.
 */
function proxyNamespace<T extends object>(getNs: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop: string) {
      return (...args: unknown[]) => {
        const ns = getNs()
        const fn = (ns as Record<string, unknown>)[prop]
        if (typeof fn !== 'function') {
          throw new Error(`[api] ${prop} is not a function`)
        }
        return fn.apply(ns, args)
      }
    },
  })
}

// Window namespace needs special handling — fire-and-forget methods that should not throw
const windowApi = {
  minimize: () => { try { getApi().window.minimize() } catch (e) { console.warn(e) } },
  maximize: () => { try { getApi().window.maximize() } catch (e) { console.warn(e) } },
  close: () => { try { getApi().window.close() } catch (e) { console.warn(e) } },
  isMaximized: (): Promise<boolean> => {
    try { return getApi().window.isMaximized() } catch { return Promise.resolve(false) }
  },
}

export const api = {
  window:   windowApi,
  accounts: proxyNamespace(() => getApi().accounts),
  tagRules: proxyNamespace(() => getApi().tagRules),
  data:     proxyNamespace(() => getApi().data),
  groups:   proxyNamespace(() => getApi().groups),
  app:      proxyNamespace(() => getApi().app),
  updater:  proxyNamespace(() => getApi().updater),
  settings: proxyNamespace(() => getApi().settings),
}
