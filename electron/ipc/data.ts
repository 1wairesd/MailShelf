import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import { DatabaseService } from '../database'
import { CreateAccountInput } from '../types'
import { validateCreateInput } from './accounts'
import { ensureDb } from './validators'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMPORT_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const MAX_IMPORT_ACCOUNTS  = 100_000

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

/** Parses and validates a raw JSON import payload, returns account array or throws. */
function parseImportFile(filePath: string): CreateAccountInput[] {
  const stat = fs.statSync(filePath)
  if (stat.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error('File too large (max 50MB)')
  }

  let data: unknown
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    throw new Error('Invalid JSON file')
  }

  const rawAccounts =
    (data as { accounts?: unknown[] }).accounts ??
    (Array.isArray(data) ? data : null)

  if (!Array.isArray(rawAccounts))          throw new Error('Invalid format')
  if (rawAccounts.length > MAX_IMPORT_ACCOUNTS) throw new Error('Too many accounts (max 100,000)')

  // Validate every account before touching the DB — reject the whole file on any error
  return rawAccounts.map((a, i) => {
    try {
      return validateCreateInput(a)
    } catch (e) {
      throw new Error(`Account #${i + 1}: ${(e as Error).message}`)
    }
  })
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

export function registerDataIpc(
  getDb: () => DatabaseService | null,
  getWindow: () => BrowserWindow | null
) {
  const win = () => getWindow()!
  const db  = () => ensureDb(getDb)

  ipcMain.handle('data:export', async () => {
    const result = await dialog.showSaveDialog(win(), {
      title:       'Export Accounts',
      defaultPath: `mailshelf-export-${todayString()}.json`,
      filters:     [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return { success: false }

    const accounts = db().exportAccounts()
    fs.writeFileSync(result.filePath, JSON.stringify({ version: 1, accounts }, null, 2), 'utf-8')
    return { success: true, count: accounts.length }
  })

  ipcMain.handle('data:exportCSV', async () => {
    const result = await dialog.showSaveDialog(win(), {
      title:       'Export Accounts as CSV',
      defaultPath: `mailshelf-export-${todayString()}.csv`,
      filters:     [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return { success: false }

    const { csv, count } = db().exportAccountsCSV()
    fs.writeFileSync(result.filePath, csv, 'utf-8')
    return { success: true, count }
  })

  ipcMain.handle('data:import', async () => {
    const result = await dialog.showOpenDialog(win(), {
      title:      'Import Accounts',
      filters:    [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return { success: false }

    let validated: CreateAccountInput[]
    try {
      validated = parseImportFile(result.filePaths[0])
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }

    const count = db().importAccounts(validated)
    return { success: true, count }
  })
}
