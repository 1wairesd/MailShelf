import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = React.createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return React.useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-2), { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2200)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <ToastStack toasts={toasts} />,
        document.body
      )}
    </ToastContext.Provider>
  )
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-10 inset-x-0 z-[9999] flex flex-col items-center gap-1.5 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    // mount → visible
    const show = requestAnimationFrame(() => setVisible(true))
    // start fade-out before removal
    const hide = setTimeout(() => setVisible(false), 1800)
    return () => {
      cancelAnimationFrame(show)
      clearTimeout(hide)
    }
  }, [])

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
        'border shadow-lg backdrop-blur-sm transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
        t.type === 'success' && 'bg-zinc-900/95 border-green-500/25 text-green-300',
        t.type === 'error'   && 'bg-zinc-900/95 border-red-500/25 text-red-300',
        t.type === 'info'    && 'bg-zinc-900/95 border-zinc-700/60 text-zinc-300',
      )}
    >
      {t.type === 'success' && <CheckCircle2 size={12} className="shrink-0" />}
      {t.type === 'error'   && <XCircle      size={12} className="shrink-0" />}
      {t.type === 'info'    && <Info         size={12} className="shrink-0" />}
      {t.message}
    </div>
  )
}
