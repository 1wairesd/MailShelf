import { contextBridge, ipcRenderer } from 'electron'
import { AccountFilters, CreateAccountInput, UpdateAccountInput, CreateTagRuleInput, UpdateTagRuleInput, CreateGroupInput, UpdateGroupInput } from './types'
import type { AppSettings } from './settings'

const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // Accounts CRUD
  accounts: {
    getAll: (filters?: AccountFilters) =>
      ipcRenderer.invoke('accounts:getAll', filters ?? {}),
    getById: (id: string) =>
      ipcRenderer.invoke('accounts:getById', id),
    create: (input: CreateAccountInput) =>
      ipcRenderer.invoke('accounts:create', input),
    update: (id: string, input: UpdateAccountInput) =>
      ipcRenderer.invoke('accounts:update', id, input),
    delete: (id: string) =>
      ipcRenderer.invoke('accounts:delete', id),
    bulkDelete: (ids: string[]) =>
      ipcRenderer.invoke('accounts:bulkDelete', ids),
    bulkUpdateStatus: (ids: string[], status: string) =>
      ipcRenderer.invoke('accounts:bulkUpdateStatus', ids, status),
    bulkUpdateTag: (ids: string[], tag: string, mode: 'add' | 'remove') =>
      ipcRenderer.invoke('accounts:bulkUpdateTag', ids, tag, mode),
    getStats: () =>
      ipcRenderer.invoke('accounts:getStats'),
    getTags: () =>
      ipcRenderer.invoke('accounts:getTags'),
    getTagCounts: () =>
      ipcRenderer.invoke('accounts:getTagCounts'),
  },

  // Tag Rules
  tagRules: {    getAll: () =>
      ipcRenderer.invoke('tagRules:getAll'),
    create: (input: CreateTagRuleInput) =>
      ipcRenderer.invoke('tagRules:create', input),
    update: (id: string, input: UpdateTagRuleInput) =>
      ipcRenderer.invoke('tagRules:update', id, input),
    delete: (id: string) =>
      ipcRenderer.invoke('tagRules:delete', id),
    run: () =>
      ipcRenderer.invoke('tagRules:run'),
    onApplied: (cb: (data: { results: { ruleId: string; affected: number }[]; totalAffected: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: Parameters<typeof cb>[0]) => cb(data)
      ipcRenderer.on('tagRules:applied', handler)
      return () => ipcRenderer.removeListener('tagRules:applied', handler)
    },
  },

  // Import/Export
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    exportCSV: () => ipcRenderer.invoke('data:exportCSV'),
    import: () => ipcRenderer.invoke('data:import'),
  },

  // Groups / Folders
  groups: {
    getAll: () => ipcRenderer.invoke('groups:getAll'),
    getCounts: () => ipcRenderer.invoke('groups:getCounts'),
    create: (input: CreateGroupInput) => ipcRenderer.invoke('groups:create', input),
    update: (id: string, input: UpdateGroupInput) => ipcRenderer.invoke('groups:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('groups:delete', id),
    addAccounts: (groupId: string, accountIds: string[]) => ipcRenderer.invoke('groups:addAccounts', groupId, accountIds),
    removeAccounts: (groupId: string, accountIds: string[]) => ipcRenderer.invoke('groups:removeAccounts', groupId, accountIds),
    moveAccounts: (groupId: string | null, accountIds: string[]) => ipcRenderer.invoke('groups:moveAccounts', groupId, accountIds),
    getAccountGroups: (accountId: string) => ipcRenderer.invoke('groups:getAccountGroups', accountId),
  },

  // App
  app: {
    checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  },

  // Settings
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    updateUpdates: (patch: Partial<AppSettings['updates']>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:updateUpdates', patch),
    updateAppearance: (patch: Partial<AppSettings['appearance']>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:updateAppearance', patch),
    applyUpdaterSettings: () => ipcRenderer.send('updater:applySettings'),
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.send('updater:install'),
    onUpdateAvailable: (cb: (info: { version: string; releaseNotes?: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, info: Parameters<typeof cb>[0]) => cb(info)
      ipcRenderer.on('updater:update-available', handler)
      return () => ipcRenderer.removeListener('updater:update-available', handler)
    },
    onUpdateNotAvailable: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('updater:update-not-available', handler)
      return () => ipcRenderer.removeListener('updater:update-not-available', handler)
    },
    onDownloadProgress: (cb: (p: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, p: Parameters<typeof cb>[0]) => cb(p)
      ipcRenderer.on('updater:download-progress', handler)
      return () => ipcRenderer.removeListener('updater:download-progress', handler)
    },
    onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, info: Parameters<typeof cb>[0]) => cb(info)
      ipcRenderer.on('updater:update-downloaded', handler)
      return () => ipcRenderer.removeListener('updater:update-downloaded', handler)
    },
    onError: (cb: (err: { message: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, err: Parameters<typeof cb>[0]) => cb(err)
      ipcRenderer.on('updater:error', handler)
      return () => ipcRenderer.removeListener('updater:error', handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
