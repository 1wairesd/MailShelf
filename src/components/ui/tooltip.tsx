import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)
  const [coords, setCoords] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const show = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    let x = rect.left + rect.width / 2
    let y = rect.top

    if (side === 'bottom') y = rect.bottom
    if (side === 'left') { x = rect.left; y = rect.top + rect.height / 2 }
    if (side === 'right') { x = rect.right; y = rect.top + rect.height / 2 }

    setCoords({ x, y })
    setVisible(true)
  }

  const hide = () => setVisible(false)

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    pointerEvents: 'none',
    transform: side === 'top'
      ? 'translate(-50%, calc(-100% - 6px))'
      : side === 'bottom'
      ? 'translate(-50%, 6px)'
      : side === 'left'
      ? 'translate(calc(-100% - 6px), -50%)'
      : 'translate(6px, -50%)',
    left: coords.x,
    top: coords.y,
  }

  return (
    <div
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && createPortal(
        <div
          style={tooltipStyle}
          className={cn(
            'px-2 py-1 text-xs text-white bg-zinc-800 border border-zinc-700 rounded-md whitespace-nowrap',
            className
          )}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  )
}
