import { useEffect, useRef } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { Button } from './ui/button'

export function ConfirmDialog() {
  const { confirmDialog, closeConfirm } = useAccountStore()
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus cancel button when dialog opens (safe default)
  useEffect(() => {
    if (confirmDialog?.open) {
      setTimeout(() => cancelRef.current?.focus(), 50)
    }
  }, [confirmDialog?.open])

  // Keyboard: Escape → cancel
  useEffect(() => {
    if (!confirmDialog?.open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [confirmDialog?.open, closeConfirm])

  if (!confirmDialog?.open) return null

  const { title, description, confirmLabel, confirmVariant = 'destructive', onConfirm } = confirmDialog

  const handleConfirm = () => {
    onConfirm()
    closeConfirm()
  }

  const isDestructive = confirmVariant === 'destructive'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeConfirm}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-shelf-surface border border-shelf-border rounded-xl shadow-2xl animate-scale-in">
        <div className="p-5">
          {/* Icon + title */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 ${
              isDestructive ? 'bg-red-500/10' : 'bg-shelf-accent/10'
            }`}>
              {isDestructive
                ? <AlertTriangle size={16} className="text-red-400" />
                : <ShieldAlert size={16} className="text-shelf-accent" />
              }
            </div>
            <div>
              <h2 className="text-sm font-semibold text-shelf-text">{title}</h2>
              <p className="text-sm text-shelf-text-muted mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-shelf-border">
          <Button
            ref={cancelRef}
            variant="ghost"
            size="sm"
            onClick={closeConfirm}
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
            className="gap-1.5"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
