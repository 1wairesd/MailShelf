import React from 'react'
import { Minus, Square, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function TitleBar() {
  const isMac = navigator.platform.toLowerCase().includes('mac')

  return (
    <div
      className={cn(
        'flex items-center h-10 pl-3 border-b border-shelf-border bg-shelf-bg select-none drag-region shrink-0',
        'relative z-10'
      )}
    >
      {/* Mac traffic lights space */}
      {isMac && <div className="w-16" />}

      {/* Title — centered absolutely so it stays in the middle regardless of controls */}
      <div className="absolute inset-x-0 flex justify-center pointer-events-none">
        <span className="text-sm font-semibold text-shelf-text tracking-tight">MailShelf</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Windows controls */}
      {!isMac && (
        <div className="flex items-center no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => api.window.minimize()}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="h-10 w-10 flex items-center justify-center text-shelf-text-muted hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => api.window.maximize()}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="h-10 w-10 flex items-center justify-center text-shelf-text-muted hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
          >
            <Square size={12} />
          </button>
          <button
            onClick={() => api.window.close()}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="h-10 w-10 flex items-center justify-center text-shelf-text-muted hover:text-white hover:bg-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
