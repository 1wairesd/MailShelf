import { BrowserWindow } from 'electron'
import { DatabaseService } from './database'

const INTERVAL_MS = 60 * 60 * 1000 // 1 hour

let timer: ReturnType<typeof setInterval> | null = null

function runAndNotify(getDb: () => DatabaseService | null, getWindow: () => BrowserWindow | null) {
  const db = getDb()
  if (!db) return

  try {
    const results = db.runTagRules()
    const totalAffected = results.reduce((sum, r) => sum + r.affected, 0)

    if (totalAffected > 0) {
      console.log(`[Scheduler] Tag rules ran: ${totalAffected} account(s) updated`)
      // Notify renderer to reload accounts
      const win = getWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('tagRules:applied', { results, totalAffected })
      }
    }
  } catch (err) {
    console.error('[Scheduler] Tag rules error:', err)
  }
}

export function startScheduler(
  getDb: () => DatabaseService | null,
  getWindow: () => BrowserWindow | null
) {
  // Run immediately on startup
  runAndNotify(getDb, getWindow)

  // Then every hour
  timer = setInterval(() => runAndNotify(getDb, getWindow), INTERVAL_MS)
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
