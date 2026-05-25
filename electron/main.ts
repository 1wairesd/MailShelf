import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { DatabaseService } from './database'
import { initCrypto, clearCrypto } from './crypto'
import { AccountFilters, CreateAccountInput, UpdateAccountInput, AccountStatus } from './types'

let mainWindow: BrowserWindow | null = null
let db: DatabaseService | null = null

const isDev = process.env.NODE_ENV === 'development'

// ─── App identity (must be set before app is ready) ─────────────────────────
// Ensures Windows Task Manager, taskbar, and notifications show "MailShelf"
// instead of the generic "Electron" process name.
app.setName('MailShelf')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.mailshelf.app')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f11',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,           // ← enable sandbox (most important)
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    show: false,
    icon: path.join(__dirname, '../resources/icon.ico'),
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // ── Block all navigation away from the app ──────────────────────────────
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`
    if (!url.startsWith(appUrl)) {
      event.preventDefault()
      console.warn('[Security] Blocked navigation to:', url)
    }
  })

  // Block new window creation entirely (already handled by setWindowOpenHandler below)
  mainWindow.webContents.on('did-navigate', (_event, url) => {
    const appUrl = isDev ? 'http://localhost:5173' : 'file://'
    if (!url.startsWith(appUrl)) {
      console.warn('[Security] Unexpected navigation to:', url)
      mainWindow?.loadURL(isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`)
    }
  })

  // ── Set strict CSP via session ──────────────────────────────────────────
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' ws://localhost:5173"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'none'"
        ],
      },
    })
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Uncomment to open DevTools manually: mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    // Remove menu bar in production
    mainWindow.setMenu(null)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in browser, block everything else
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

// Initialize database
function initDatabase() {
  try {
    const userDataPath = app.getPath('userData')
    console.log('[MailShelf] userData path:', userDataPath)
    initCrypto(userDataPath)
    db = new DatabaseService(userDataPath)
    console.log('[MailShelf] Database initialized OK')
  } catch (err) {
    console.error('[MailShelf] FATAL: Database init failed:', err)
  }
}

// App lifecycle
app.whenReady().then(() => {
  initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db?.close()
    app.quit()
  }
})

app.on('before-quit', () => {
  db?.close()
  clearCrypto() // zero out master key from memory
})

// ─── IPC Input Validation ───────────────────────────────────────────────────

const VALID_STATUSES: AccountStatus[] = ['active', 'exhausted', 'waiting-reset', 'dead', 'archived']
const VALID_SORT_FIELDS = ['created_at', 'updated_at', 'status', 'email', 'last_used_at']
const VALID_SORT_ORDERS = ['asc', 'desc']

function validateCreateInput(input: unknown): CreateAccountInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>
  if (typeof i.email !== 'string' || !i.email.trim()) throw new Error('Invalid email')
  if (i.email.length > 320) throw new Error('Email too long')
  if (i.password !== undefined && typeof i.password !== 'string') throw new Error('Invalid password')
  if (i.provider !== undefined && typeof i.provider !== 'string') throw new Error('Invalid provider')
  if (i.notes !== undefined && typeof i.notes !== 'string') throw new Error('Invalid notes')
  if (i.notes && (i.notes as string).length > 10000) throw new Error('Notes too long')
  if (i.tags !== undefined && !Array.isArray(i.tags)) throw new Error('Invalid tags')
  if (i.status !== undefined && !VALID_STATUSES.includes(i.status as AccountStatus)) throw new Error('Invalid status')
  return {
    email: (i.email as string).trim().toLowerCase(),
    password: (i.password as string) ?? '',
    provider: (i.provider as string) ?? 'gmail',
    notes: (i.notes as string) ?? '',
    tags: (i.tags as string[]) ?? [],
    status: (i.status as AccountStatus) ?? 'active',
  }
}

function validateFilters(filters: unknown): AccountFilters {
  if (!filters || typeof filters !== 'object') return {}
  const f = filters as Record<string, unknown>
  return {
    search: typeof f.search === 'string' ? f.search.slice(0, 200) : '',
    status: VALID_STATUSES.includes(f.status as AccountStatus) ? f.status as AccountStatus : 'all' as const,
    provider: typeof f.provider === 'string' ? f.provider.slice(0, 50) : '',
    tags: Array.isArray(f.tags) ? (f.tags as string[]).filter(t => typeof t === 'string').slice(0, 20) : [],
    sortBy: VALID_SORT_FIELDS.includes(f.sortBy as string) ? f.sortBy as 'created_at' : 'created_at',
    sortOrder: VALID_SORT_ORDERS.includes(f.sortOrder as string) ? f.sortOrder as 'asc' | 'desc' : 'desc',
  }
}

// ─── Window Controls IPC ────────────────────────────────────────────────────

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:openExternal', (_event, url: string) => {
  // Only allow https GitHub URLs
  if (typeof url === 'string' && url.startsWith('https://github.com/')) {
    shell.openExternal(url)
  }
})

// ─── Accounts IPC ───────────────────────────────────────────────────────────

ipcMain.handle('accounts:getAll', (_event, filters: AccountFilters) => {
  if (!db) throw new Error('Database not initialized')
  return db.getAccounts(validateFilters(filters))
})

ipcMain.handle('accounts:getById', (_event, id: string) => {
  if (!db) throw new Error('Database not initialized')
  if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid id')
  return db.getAccountById(id)
})

ipcMain.handle('accounts:create', (_event, input: CreateAccountInput) => {
  if (!db) throw new Error('Database not initialized')
  const validated = validateCreateInput(input)
  return db.createAccount(validated)
})

ipcMain.handle('accounts:update', (_event, id: string, input: UpdateAccountInput) => {
  if (!db) throw new Error('Database not initialized')
  if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid id')
  // Partial validation for update
  const safe: UpdateAccountInput = {}
  if (input.email !== undefined) {
    if (typeof input.email !== 'string') throw new Error('Invalid email')
    safe.email = input.email.trim().toLowerCase()
  }
  if (input.password !== undefined) safe.password = String(input.password)
  if (input.provider !== undefined) safe.provider = String(input.provider)
  if (input.notes !== undefined) {
    if (typeof input.notes !== 'string') throw new Error('Invalid notes')
    if (input.notes.length > 10000) throw new Error('Notes too long')
    safe.notes = input.notes
  }
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) throw new Error('Invalid tags')
    safe.tags = input.tags.filter(t => typeof t === 'string')
  }
  if (input.status !== undefined) {
    if (!VALID_STATUSES.includes(input.status)) throw new Error('Invalid status')
    safe.status = input.status
  }
  if (input.last_used_at !== undefined) safe.last_used_at = input.last_used_at
  return db.updateAccount(id, safe)
})

ipcMain.handle('accounts:delete', (_event, id: string) => {
  if (!db) throw new Error('Database not initialized')
  if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid id')
  return db.deleteAccount(id)
})

ipcMain.handle('accounts:bulkDelete', (_event, ids: string[]) => {
  if (!db) throw new Error('Database not initialized')
  if (!Array.isArray(ids)) throw new Error('Invalid ids')
  const safeIds = ids.filter(id => typeof id === 'string' && id.trim())
  return db.bulkDeleteAccounts(safeIds)
})

ipcMain.handle('accounts:bulkUpdateStatus', (_event, ids: string[], status: string) => {
  if (!db) throw new Error('Database not initialized')
  if (!Array.isArray(ids)) throw new Error('Invalid ids')
  if (!VALID_STATUSES.includes(status as AccountStatus)) throw new Error('Invalid status')
  const safeIds = ids.filter(id => typeof id === 'string' && id.trim())
  return db.bulkUpdateStatus(safeIds, status)
})

ipcMain.handle('accounts:bulkUpdateTag', (_event, ids: string[], tag: string, mode: string) => {
  if (!db) throw new Error('Database not initialized')
  if (!Array.isArray(ids)) throw new Error('Invalid ids')
  if (typeof tag !== 'string' || !tag.trim()) throw new Error('Invalid tag')
  if (mode !== 'add' && mode !== 'remove') throw new Error('Invalid mode')
  const safeTag = tag.trim().toLowerCase().slice(0, 100)
  const safeIds = ids.filter(id => typeof id === 'string' && id.trim())
  return db.bulkUpdateTag(safeIds, safeTag, mode)
})

ipcMain.handle('accounts:getStats', () => {
  if (!db) throw new Error('Database not initialized')
  return db.getStats()
})

ipcMain.handle('accounts:getTags', () => {
  if (!db) throw new Error('Database not initialized')
  return db.getAllTags()
})

// ─── Updates IPC ─────────────────────────────────────────────────────────────

ipcMain.handle('app:checkForUpdates', async () => {
  const currentVersion = app.getVersion() // from package.json "version"

  try {
    // Read repo from package.json at runtime
    const pkgPath = path.join(__dirname, '../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      repository?: { url?: string } | string
    }

    const repoUrl = typeof pkg.repository === 'string'
      ? pkg.repository
      : pkg.repository?.url ?? ''

    // Extract "owner/repo" from various URL formats
    const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/)
    if (!match) return { hasUpdate: false, currentVersion, error: 'No GitHub repository configured' }

    const ownerRepo = match[1]
    const apiUrl = `https://api.github.com/repos/${ownerRepo}/releases/latest`

    // Use Node's built-in https to avoid extra deps
    const latestTag = await new Promise<string>((resolve, reject) => {
      const https = require('https') as typeof import('https')
      const req = https.get(
        apiUrl,
        { headers: { 'User-Agent': 'MailShelf-UpdateCheck', 'Accept': 'application/vnd.github+json' } },
        (res) => {
          let data = ''
          res.on('data', chunk => { data += chunk })
          res.on('end', () => {
            try {
              const json = JSON.parse(data) as { tag_name?: string; message?: string }
              if (json.tag_name) resolve(json.tag_name)
              else reject(new Error(json.message ?? 'No tag_name in response'))
            } catch (e) {
              reject(e)
            }
          })
        }
      )
      req.on('error', reject)
      req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')) })
    })

    // Normalise: strip leading "v"
    const normalize = (v: string) => v.replace(/^v/, '')
    const latest = normalize(latestTag)
    const current = normalize(currentVersion)

    const hasUpdate = latest !== current && compareVersions(latest, current) > 0

    return {
      hasUpdate,
      currentVersion: `v${current}`,
      latestVersion: `v${latest}`,
      releaseUrl: `https://github.com/${ownerRepo}/releases/latest`,
    }
  } catch (err) {
    return { hasUpdate: false, currentVersion: `v${currentVersion}`, error: String(err) }
  }
})

/** Simple semver comparator — returns 1 if a > b, -1 if a < b, 0 if equal */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

// ─── Import/Export IPC ──────────────────────────────────────────────────────

ipcMain.handle('data:export', async () => {
  // Warn user that passwords will be in plaintext
  const confirm = await dialog.showMessageBox(mainWindow!, {
    type: 'none',
    title: 'Export Accounts',
    message: 'Passwords will be exported in plain text',
    detail: 'The export file will contain all passwords unencrypted. Make sure to store it in a safe place.',
    buttons: ['Export', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  })
  if (confirm.response === 1) return { success: false }

  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export Accounts',
    defaultPath: `mailshelf-export-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (result.canceled || !result.filePath) return { success: false }

  const accounts = db?.exportAccounts() ?? []
  fs.writeFileSync(result.filePath, JSON.stringify({ version: 1, accounts }, null, 2), 'utf-8')
  return { success: true, count: accounts.length }
})

ipcMain.handle('data:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Import Accounts',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })

  if (result.canceled || !result.filePaths[0]) return { success: false }

  // FIX: limit file size to 50MB to prevent DoS
  const stat = fs.statSync(result.filePaths[0])
  if (stat.size > 50 * 1024 * 1024) {
    return { success: false, error: 'File too large (max 50MB)' }
  }

  let data: { accounts?: unknown[]; version?: number } | unknown[]
  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8')
    data = JSON.parse(raw)
  } catch {
    return { success: false, error: 'Invalid JSON file' }
  }

  // FIX: validate structure
  const rawAccounts = (data as { accounts?: unknown[] }).accounts ?? (Array.isArray(data) ? data : null)
  if (!Array.isArray(rawAccounts)) {
    return { success: false, error: 'Invalid format: expected array of accounts' }
  }

  // FIX: limit number of accounts per import
  if (rawAccounts.length > 100_000) {
    return { success: false, error: 'Too many accounts (max 100,000 per import)' }
  }

  if (!db) throw new Error('Database not initialized')
  const count = db.importAccounts(rawAccounts as never)
  return { success: true, count }
})
