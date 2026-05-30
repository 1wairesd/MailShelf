import { create } from 'zustand'
import type { AppSettings } from '@/lib/api'

type Theme = AppSettings['appearance']['theme']

interface SettingsState {
  theme: Theme
  loadSettings: () => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
}

/** Apply the resolved theme class to <html> */
function applyTheme(theme: Theme) {
  const html = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  html.classList.toggle('dark', isDark)
  html.classList.toggle('light', !isDark)
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',

  loadSettings: async () => {
    try {
      const s = await window.api.settings.get()
      const theme = s.appearance?.theme ?? 'system'
      set({ theme })
      applyTheme(theme)
    } catch {
      applyTheme('system')
    }
  },

  setTheme: async (theme: Theme) => {
    set({ theme })
    applyTheme(theme)
    try {
      await window.api.settings.updateAppearance({ theme })
    } catch {
      // best-effort
    }
  },
}))

// Re-apply when system preference changes (for 'system' mode)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme } = useSettingsStore.getState()
  if (theme === 'system') applyTheme('system')
})
