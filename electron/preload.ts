import { contextBridge, ipcRenderer } from 'electron'
import { AccountFilters, CreateAccountInput, UpdateAccountInput, CreateTagRuleInput, UpdateTagRuleInput } from './types'

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
  },

  // Tag Rules
  tagRules: {
    getAll: () =>
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
    import: () => ipcRenderer.invoke('data:import'),
  },

  // App
  app: {
    checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
