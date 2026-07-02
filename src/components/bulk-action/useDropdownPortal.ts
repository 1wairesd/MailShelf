import { useState, useEffect, useRef } from 'react'

/**
 * Shared logic for portal-based dropdown menus.
 * Returns trigger ref, open state, bounding rect, and a close handler.
 */
export function useDropdownPortal(portalId: string) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen]   = useState(false)
  const [rect, setRect]   = useState<DOMRect | null>(null)

  // Keep rect in sync while open
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const portal = document.getElementById(portalId)
      if (
        triggerRef.current?.contains(e.target as Node) ||
        portal?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, portalId])

  return { triggerRef, open, setOpen, rect }
}
