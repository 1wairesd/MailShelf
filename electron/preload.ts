import { contextBridge, ipcRenderer } from 'electron'
import { AccountFilters, CreateAccountInput, UpdateAccountInput } from './types'

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
    getStats: () =>
      ipcRenderer.invoke('accounts:getStats'),
    getTags: () =>
      ipcRenderer.invoke('accounts:getTags'),
  },

  // Import/Export
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: () => ipcRenderer.invoke('data:import'),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
