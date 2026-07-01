import { ipcMain } from 'electron'
import { getSettings, updateSettings, AppSettings } from '../settings'

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_INTERVALS: AppSettings['updates']['checkIntervalHours'][] = [0, 1, 4, 24]
const VALID_THEMES:    AppSettings['appearance']['theme'][]            = ['dark', 'light', 'system']

// ─── Input validators ─────────────────────────────────────────────────────────

function validateUpdatesPatch(input: unknown): Partial<AppSettings['updates']> {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>
  const patch: Partial<AppSettings['updates']> = {}

  if (i.checkOnStartup  !== undefined) patch.checkOnStartup = Boolean(i.checkOnStartup)
  if (i.autoDownload    !== undefined) patch.autoDownload    = Boolean(i.autoDownload)

  if (i.checkIntervalHours !== undefined) {
    const v = Number(i.checkIntervalHours) as AppSettings['updates']['checkIntervalHours']
    if (!VALID_INTERVALS.includes(v)) throw new Error('Invalid checkIntervalHours')
    patch.checkIntervalHours = v
  }

  if (i.channel !== undefined) {
    if (i.channel !== 'stable' && i.channel !== 'beta') throw new Error('Invalid channel')
    patch.channel = i.channel
  }

  return patch
}

function validateAppearancePatch(input: unknown): Partial<AppSettings['appearance']> {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>
  const patch: Partial<AppSettings['appearance']> = {}

  if (i.theme !== undefined) {
    if (!VALID_THEMES.includes(i.theme as AppSettings['appearance']['theme'])) {
      throw new Error('Invalid theme')
    }
    patch.theme = i.theme as AppSettings['appearance']['theme']
  }

  return patch
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:updateUpdates', (_e, patch: unknown) =>
    updateSettings({ updates: validateUpdatesPatch(patch) as AppSettings['updates'] })
  )

  ipcMain.handle('settings:updateAppearance', (_e, patch: unknown) =>
    updateSettings({ appearance: validateAppearancePatch(patch) as AppSettings['appearance'] })
  )
}
