import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { DatabaseService } from './database'
import { initCrypto, clearCrypto } from './crypto'
import { registerAccountsIpc } from './ipc/accounts'
import { registerDataIpc } from './ipc/data'
import { registerAppIpc } from './ipc/app'

let mainWindow: BrowserWindow | null = null
let db: DatabaseService | null = null

const isDev = process.env.NODE_ENV === 'development'

// ─── App identity ────────────────────────────────────────────────────────────
app.setName('MailShelf')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.mailshelf.app')
}

// ─── Window ──────────────────────────────────────────────────────────────────

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
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    show: false,
    icon: path.join(__dirname, '../../resources/icon.ico'),
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Block navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../../dist/index.html')}`
    if (!url.startsWith(appUrl)) {
      event.preventDefault()
      console.warn('[Security] Blocked navigation to:', url)
    }
  })

  mainWindow.webContents.on('did-navigate', (_event, url) => {
    const appUrl = isDev ? 'http://localhost:5173' : 'file://'
    if (!url.startsWith(appUrl)) {
      console.warn('[Security] Unexpected navigation to:', url)
      mainWindow?.loadURL(
        isDev
          ? 'http://localhost:5173'
          : `file://${path.join(__dirname, '../../dist/index.html')}`
      )
    }
  })

  // Strict CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' ws://localhost:5173"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'none'",
        ],
      },
    })
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
    mainWindow.setMenu(null)
  }

  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

// ─── Database ─────────────────────────────────────────────────────────────────

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

// ─── IPC ──────────────────────────────────────────────────────────────────────

function registerIpc() {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

  // Domain IPC modules
  registerAccountsIpc(() => db)
  registerDataIpc(() => db, () => mainWindow)
  registerAppIpc()
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  initDatabase()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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
  clearCrypto()
})
