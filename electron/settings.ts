import fs from 'fs'
import path from 'path'

export interface AppSettings {
  updates: {
    /** Check for updates on startup */
    checkOnStartup: boolean
    /** Automatically download update in background when found */
    autoDownload: boolean
    /** How often to recheck in hours (0 = never / manual only) */
    checkIntervalHours: 1 | 4 | 24 | 0
    /** Update channel: stable only, or include pre-releases */
    channel: 'stable' | 'beta'
  }
  appearance: {
    /** Color theme */
    theme: 'dark' | 'light' | 'system'
  }
}

const DEFAULTS: AppSettings = {
  updates: {
    checkOnStartup: true,
    autoDownload: true,
    checkIntervalHours: 4,
    channel: 'stable',
  },
  appearance: {
    theme: 'system',
  },
}

let settingsPath = ''
let _cache: AppSettings | null = null

export function initSettings(userDataPath: string) {
  settingsPath = path.join(userDataPath, 'settings.json')
}

export function getSettings(): AppSettings {
  if (_cache) return _cache
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    // Deep merge with defaults so new keys always have a value
    _cache = {
      updates: { ...DEFAULTS.updates, ...(parsed.updates ?? {}) },
      appearance: { ...DEFAULTS.appearance, ...(parsed.appearance ?? {}) },
    }
  } catch {
    _cache = { ...DEFAULTS, updates: { ...DEFAULTS.updates }, appearance: { ...DEFAULTS.appearance } }
  }
  return _cache
}

export function saveSettings(settings: AppSettings): void {
  _cache = settings
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const next: AppSettings = {
    updates: { ...current.updates, ...(patch.updates ?? {}) },
    appearance: { ...current.appearance, ...(patch.appearance ?? {}) },
  }
  saveSettings(next)
  return next
}
