import { ipcMain } from 'electron'
import { getSettings, updateSettings, AppSettings } from '../settings'

const VALID_INTERVALS = [0, 1, 4, 24]

function validateUpdatesPatch(input: unknown): Partial<AppSettings['updates']> {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>
  const patch: Partial<AppSettings['updates']> = {}

  if (i.checkOnStartup !== undefined) patch.checkOnStartup = Boolean(i.checkOnStartup)
  if (i.autoDownload !== undefined) patch.autoDownload = Boolean(i.autoDownload)
  if (i.checkIntervalHours !== undefined) {
    const v = Number(i.checkIntervalHours)
    if (!VALID_INTERVALS.includes(v)) throw new Error('Invalid checkIntervalHours')
    patch.checkIntervalHours = v as AppSettings['updates']['checkIntervalHours']
  }
  return patch
}

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:updateUpdates', (_e, patch: unknown) => {
    const validated = validateUpdatesPatch(patch)
    return updateSettings({ updates: validated as AppSettings['updates'] })
  })
}
