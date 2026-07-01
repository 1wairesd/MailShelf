import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import { DatabaseService } from '../database'
import { CreateAccountInput } from '../types'
import { validateCreateInput } from './accounts'

export function registerDataIpc(
  getDb: () => DatabaseService | null,
  getWindow: () => BrowserWindow | null
) {
  ipcMain.handle('data:export', async () => {
    const win = getWindow()
    const db = getDb()

    const result = await dialog.showSaveDialog(win!, {
      title: 'Export Accounts',
      defaultPath: `mailshelf-export-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return { success: false }

    const accounts = db?.exportAccounts() ?? []
    fs.writeFileSync(result.filePath, JSON.stringify({ version: 1, accounts }, null, 2), 'utf-8')
    return { success: true, count: accounts.length }
  })

  ipcMain.handle('data:exportCSV', async () => {
    const win = getWindow()
    const db = getDb()

    const result = await dialog.showSaveDialog(win!, {
      title: 'Export Accounts as CSV',
      defaultPath: `mailshelf-export-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return { success: false }

    const csv = db?.exportAccountsCSV() ?? ''
    const count = db?.exportAccounts().length ?? 0
    fs.writeFileSync(result.filePath, csv, 'utf-8')
    return { success: true, count }
  })

  ipcMain.handle('data:import', async () => {
    const win = getWindow()
    const db = getDb()

    const result = await dialog.showOpenDialog(win!, {
      title: 'Import Accounts',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return { success: false }

    const stat = fs.statSync(result.filePaths[0])
    if (stat.size > 50 * 1024 * 1024) return { success: false, error: 'File too large (max 50MB)' }

    let data: { accounts?: unknown[]; version?: number } | unknown[]
    try {
      data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'))
    } catch {
      return { success: false, error: 'Invalid JSON file' }
    }

    const rawAccounts = (data as { accounts?: unknown[] }).accounts ?? (Array.isArray(data) ? data : null)
    if (!Array.isArray(rawAccounts)) return { success: false, error: 'Invalid format' }
    if (rawAccounts.length > 100_000) return { success: false, error: 'Too many accounts (max 100,000)' }
    if (!db) throw new Error('Database not initialized')

    // Validate every account before touching the DB — reject the whole file on any error
    let validated: CreateAccountInput[]
    try {
      validated = rawAccounts.map((a, i) => {
        try {
          return validateCreateInput(a)
        } catch (e) {
          throw new Error(`Account #${i + 1}: ${(e as Error).message}`)
        }
      })
    } catch (e) {
      return { success: false, error: `Validation failed — ${(e as Error).message}` }
    }

    const count = db.importAccounts(validated)
    return { success: true, count }
  })
}
