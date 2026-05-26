import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
  separator?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation()  // prevent card onClick
    if (open) {
      setOpen(false)
      return
    }
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({
      x: align === 'right' ? rect.right : rect.left,
      y: rect.bottom + 4,
    })
    setOpen(true)
  }

  // Close on outside click — use pointerdown so we catch it before React's
  // synthetic onClick fires on parent elements (avoids the race where closing
  // the dropdown swallows the card click).
  React.useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    // rAF so the pointerdown that opened the menu doesn't immediately close it
    let rafId: number
    rafId = requestAnimationFrame(() => {
      document.addEventListener('pointerdown', handler)
    })
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('pointerdown', handler)
    }
  }, [open])

  // Close on scroll
  React.useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    top: coords.y,
    ...(align === 'right'
      ? { right: window.innerWidth - coords.x }
      : { left: coords.x }),
  }

  return (
    <div ref={triggerRef} className={cn('relative inline-flex', className)}>
      <div onClick={handleTriggerClick}>{trigger}</div>

      {open && createPortal(
        <div
          style={menuStyle}
          className="min-w-[160px] bg-shelf-elevated border border-shelf-border rounded-lg shadow-xl py-1 animate-scale-in"
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.separator && i > 0 && (
                <div className="my-1 border-t border-shelf-border" />
              )}
              <button
                onMouseDown={e => {
                  e.stopPropagation()
                  if (!item.disabled) {
                    item.onClick()
                    setOpen(false)
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left',
                  item.variant === 'destructive'
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-shelf-text hover:bg-shelf-border',
                  item.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {item.icon && (
                  <span className="text-shelf-text-muted">{item.icon}</span>
                )}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
