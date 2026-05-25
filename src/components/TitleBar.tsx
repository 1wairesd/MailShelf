import React from 'react'
import { Minus, Square, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// Logo SVG inline
function MailShelfLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#6366f1" />
      <rect x="5" y="10" width="22" height="15" rx="3" fill="white" fillOpacity="0.15" />
      <rect x="5" y="10" width="22" height="15" rx="3" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
      <path d="M5 13L16 19L27 13" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="9" y="6" width="14" height="2" rx="1" fill="white" fillOpacity="0.5" />
      <rect x="12" y="3" width="8" height="2" rx="1" fill="white" fillOpacity="0.3" />
    </svg>
  )
}

export function TitleBar() {
  const isMac = navigator.platform.toLowerCase().includes('mac')

  return (
    <div
      className={cn(
        'flex items-center h-10 px-3 border-b border-shelf-border bg-shelf-bg select-none drag-region shrink-0',
        'relative z-10'
      )}
    >
      {/* Mac traffic lights space */}
      {isMac && <div className="w-16" />}

      {/* Logo + Title */}
      <div className="flex items-center gap-2 no-drag">
        <MailShelfLogo size={18} />
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
