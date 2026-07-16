import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { DatabaseService } from './database'
import { initCrypto, clearCrypto } from './crypto'
import { registerAccountsIpc } from './ipc/accounts'
import { registerDataIpc } from './ipc/data'
import { registerAppIpc } from './ipc/app'
import { registerTagRulesIpc } from './ipc/tagRules'
import { registerSettingsIpc } from './ipc/settings'
import { registerGroupsIpc } from './ipc/groups'
import { startScheduler, stopScheduler } from './scheduler'
import { initSettings, getSettings } from './settings'

let mainWindow: BrowserWindow | null = null
let db: DatabaseService | null = null

const isDev = process.env.NODE_ENV === 'development'

// ─── Auto-updater ─────────────────────────────────────────────────────────────

let updateCheckTimer: ReturnType<typeof setInterval> | null = null

function initAutoUpdater() {
  if (isDev) return

  const settings = getSettings()
  const { checkOnStartup, autoDownload, checkIntervalHours, channel } = settings.updates

  autoUpdater.autoDownload = autoDownload
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.channel = channel === 'beta' ? 'beta' : 'latest'
  autoUpdater.allowPrerelease = channel === 'beta'
  // Disable code signature verification — app is not commercially signed
  ;(autoUpdater as any).verifyUpdateCodeSignature = false

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:download-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message)
    mainWindow?.webContents.send('updater:error', { message: err.message })
  })

  if (checkOnStartup) {
    autoUpdater.checkForUpdates().catch(err =>
      console.error('[Updater] startup check failed:', err)
    )
  }

  scheduleUpdateCheck(checkIntervalHours)
}

function scheduleUpdateCheck(intervalHours: number) {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer)
    updateCheckTimer = null
  }
  if (intervalHours > 0) {
    updateCheckTimer = setInterval(() => {
      autoUpdater.checkForUpdates().catch(err =>
        console.error('[Updater] periodic check failed:', err)
      )
    }, intervalHours * 60 * 60 * 1000)
  }
}

/** Called from settings IPC when user changes update preferences */
export function applyUpdaterSettings() {
  if (isDev) return
  const { autoDownload, checkIntervalHours, channel } = getSettings().updates
  autoUpdater.autoDownload = autoDownload
  autoUpdater.channel = channel === 'beta' ? 'beta' : 'latest'
  autoUpdater.allowPrerelease = channel === 'beta'
  scheduleUpdateCheck(checkIntervalHours)
}


app.setName('MailShelf')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.mailshelf.app')
}

// Improve font rendering sharpness in Chromium/Electron
app.commandLine.appendSwitch('enable-font-antialiasing')

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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (isDev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Forward renderer console.log/warn/error to main process terminal
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const prefix = sourceId ? `[renderer ${sourceId.split('/').pop()}:${line}]` : '[renderer]'
    if (level === 2) console.warn(prefix, message)
    else if (level === 3) console.error(prefix, message)
    else console.log(prefix, message)
  })

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
    initSettings(userDataPath)
    initCrypto(userDataPath)
    db = new DatabaseService(userDataPath)
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
  registerTagRulesIpc(() => db)
  registerSettingsIpc()
  registerGroupsIpc(() => db)

  // Updater controls
  ipcMain.handle('updater:check', () =>
    autoUpdater.checkForUpdates().catch(e => ({ error: String(e) }))
  )
  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
  // Re-apply updater config when settings change
  ipcMain.on('updater:applySettings', () => applyUpdaterSettings())
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  initDatabase()
  registerIpc()
  createWindow()
  startScheduler(() => db, () => mainWindow)
  initAutoUpdater()

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
  stopScheduler()
  db?.close()
  clearCrypto()
})
