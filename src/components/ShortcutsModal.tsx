import React from 'react'
import { Dialog, DialogHeader, DialogBody } from './ui/dialog'

interface ShortcutsModalProps {
  open: boolean
  onClose: () => void
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
const Mod = isMac ? '⌘' : 'Ctrl'

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: [Mod, 'F'], description: 'Focus search' },
    { keys: ['↑', '↓'], description: 'Navigate accounts' },
    { keys: ['Enter'], description: 'Open selected account' },
    { keys: ['Esc'], description: 'Close / deselect' },
  ]},
  { category: 'Actions', items: [
    { keys: [Mod, 'N'], description: 'New account' },
    { keys: [Mod, 'E'], description: 'Edit selected account' },
    { keys: ['Del'], description: 'Delete selected account' },
    { keys: ['Space'], description: 'Toggle selection' },
    { keys: [Mod, 'A'], description: 'Select all' },
  ]},
  { category: 'Copy', items: [
    { keys: [Mod, 'C'], description: 'Copy email' },
    { keys: [Mod, 'Shift', 'C'], description: 'Copy password' },
  ]},
  { category: 'Data', items: [
    { keys: [Mod, 'I'], description: 'Import JSON' },
    { keys: [Mod, 'Shift', 'E'], description: 'Export JSON' },
    { keys: ['?'], description: 'Show shortcuts' },
  ]},
]

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader title="Keyboard Shortcuts" onClose={onClose} />
      <DialogBody className="space-y-5 max-h-[60vh] overflow-y-auto">
        {SHORTCUTS.map(section => (
          <div key={section.category}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-2">
              {section.category}
            </p>
            <div className="space-y-1.5">
              {section.items.map(item => (
                <div key={item.description} className="flex items-center justify-between">
                  <span className="text-sm text-shelf-text-muted">{item.description}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, i) => (
                      <React.Fragment key={i}>
                        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-shelf-elevated border border-shelf-border rounded text-shelf-text-muted">
                          {key}
                        </kbd>
                        {i < item.keys.length - 1 && (
                          <span className="text-shelf-text-subtle text-xs">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </DialogBody>
    </Dialog>
  )
}
