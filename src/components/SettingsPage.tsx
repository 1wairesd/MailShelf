import React, { useEffect, useState } from 'react'
import { ArrowLeft, Monitor, Moon, Sun, Palette, ArrowUpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { api, type AppSettings } from '@/lib/api'

type Theme = AppSettings['appearance']['theme']

// ─── Shared Toggle ────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative rounded-full transition-colors duration-200 focus:outline-none shrink-0',
        value ? 'bg-shelf-accent' : 'bg-shelf-border'
      )}
      style={{ width: 32, height: 18 }}
    >
      <span
        className="absolute top-[3px] left-[3px] w-3 h-3 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: value ? 'translateX(14px)' : 'translateX(0)' }}
      />
    </button>
  )
}

// ─── Appearance section ───────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'dark',   label: 'Dark',   icon: <Moon size={15} />,    description: 'Always use dark theme' },
  { value: 'light',  label: 'Light',  icon: <Sun size={15} />,     description: 'Always use light theme' },
  { value: 'system', label: 'System', icon: <Monitor size={15} />, description: 'Follow OS preference' },
]

function AppearanceSection() {
  const { theme, setTheme } = useSettingsStore()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-shelf-text mb-0.5">Appearance</h2>
        <p className="text-xs text-shelf-text-subtle">Customize how MailShelf looks</p>
      </div>

      <div>
        <p className="text-sm font-medium text-shelf-text mb-3">Theme</p>
        <div className="flex flex-col gap-2 max-w-sm">
          {THEME_OPTIONS.map(opt => {
            const isActive = theme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors',
                  isActive
                    ? 'border-shelf-accent bg-shelf-accent/8 text-shelf-text'
                    : 'border-shelf-border text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
                )}
              >
                <div className={cn(
                  'w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center',
                  isActive ? 'border-shelf-accent' : 'border-shelf-border'
                )}>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-shelf-accent" />}
                </div>
                <span className={cn('shrink-0', isActive ? 'text-shelf-accent' : 'text-shelf-text-subtle')}>
                  {opt.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{opt.label}</p>
                  <p className="text-xs text-shelf-text-subtle mt-0.5">{opt.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Updates section ──────────────────────────────────────────────────────────

const INTERVAL_OPTIONS: { value: AppSettings['updates']['checkIntervalHours']; label: string }[] = [
  { value: 0,  label: 'Never (manual only)' },
  { value: 1,  label: 'Every hour' },
  { value: 4,  label: 'Every 4 hours' },
  { value: 24, label: 'Once a day' },
]

function UpdatesSection() {
  const [settings, setSettings] = useState<AppSettings['updates'] | null>(null)

  useEffect(() => {
    api.settings.get().then(s => setSettings(s.updates)).catch(() => {})
  }, [])

  const save = async (patch: Partial<AppSettings['updates']>) => {
    if (!settings) return
    const next = { ...settings, ...patch }
    setSettings(next)
    api.settings.updateUpdates(next).catch(console.error)
    api.settings.applyUpdaterSettings()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-shelf-text mb-0.5">Updates</h2>
        <p className="text-xs text-shelf-text-subtle">Control how MailShelf checks for and installs updates</p>
      </div>

      {!settings ? (
        <p className="text-sm text-shelf-text-subtle">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5 max-w-sm">
          {/* Check on startup */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-shelf-text">Check on startup</p>
              <p className="text-xs text-shelf-text-subtle mt-0.5">Look for updates when the app launches</p>
            </div>
            <Toggle value={settings.checkOnStartup} onChange={v => save({ checkOnStartup: v })} />
          </div>

          <div className="border-t border-shelf-border-subtle" />

          {/* Auto-download */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-shelf-text">Auto-download</p>
              <p className="text-xs text-shelf-text-subtle mt-0.5">Download updates silently in the background</p>
            </div>
            <Toggle value={settings.autoDownload} onChange={v => save({ autoDownload: v })} />
          </div>

          <div className="border-t border-shelf-border-subtle" />

          {/* Check interval */}
          <div>
            <p className="text-sm font-medium text-shelf-text mb-3">Check interval</p>
            <div className="flex flex-col gap-1.5">
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => save({ checkIntervalHours: opt.value })}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors',
                    settings.checkIntervalHours === opt.value
                      ? 'border-shelf-accent bg-shelf-accent/8 text-shelf-text'
                      : 'border-shelf-border text-shelf-text-muted hover:bg-shelf-elevated'
                  )}
                >
                  <div className={cn(
                    'w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center',
                    settings.checkIntervalHours === opt.value ? 'border-shelf-accent' : 'border-shelf-border'
                  )}>
                    {settings.checkIntervalHours === opt.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-shelf-accent" />
                    )}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-shelf-border-subtle" />

          {/* Channel */}
          <div>
            <p className="text-sm font-medium text-shelf-text mb-0.5">Update channel</p>
            <p className="text-xs text-shelf-text-subtle mb-3">Beta includes pre-releases — may be unstable</p>
            <div className="flex gap-2">
              {(['stable', 'beta'] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => save({ channel: ch })}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors capitalize',
                    settings.channel === ch
                      ? 'border-shelf-accent bg-shelf-accent/8 text-shelf-accent'
                      : 'border-shelf-border text-shelf-text-muted hover:bg-shelf-elevated'
                  )}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

type SectionId = 'appearance' | 'updates'

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
  { id: 'updates',    label: 'Updates',    icon: <ArrowUpCircle size={14} /> },
]

// ─── Main page ────────────────────────────────────────────────────────────────

interface SettingsPageProps {
  onClose: () => void
  initialSection?: SectionId
}

export function SettingsPage({ onClose, initialSection = 'appearance' }: SettingsPageProps) {
  const [activeSection, setActiveSection] = React.useState<SectionId>(initialSection)

  // Allow parent to jump to a specific section on open
  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-shelf-bg text-shelf-text">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-shelf-border shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-shelf-text-muted hover:text-shelf-text transition-colors text-sm"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <span className="text-shelf-border select-none">|</span>
        <h1 className="text-sm font-semibold text-shelf-text">Settings</h1>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <nav className="w-48 shrink-0 border-r border-shelf-border px-3 py-4 flex flex-col gap-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left w-full',
                activeSection === item.id
                  ? 'bg-shelf-accent/15 text-shelf-accent hover:bg-shelf-accent/25'
                  : 'text-shelf-text-muted hover:bg-shelf-elevated hover:text-shelf-text'
              )}
            >
              <span className={cn(activeSection === item.id ? 'text-shelf-accent' : 'text-shelf-text-subtle')}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'updates'    && <UpdatesSection />}
        </div>
      </div>
    </div>
  )
}
