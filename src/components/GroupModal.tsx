import React, { useState, useEffect, useRef } from 'react'
import { useGroupsStore } from '@/store/groupsStore'
import { Group } from '@/types'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'

// Preset palette
const COLOR_PRESETS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#64748b', // slate
]

interface GroupModalProps {
  open: boolean
  onClose: () => void
  editing?: Group | null
}

export function GroupModal({ open, onClose, editing }: GroupModalProps) {
  const { createGroup, updateGroup } = useGroupsStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_PRESETS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setColor(editing?.color ?? COLOR_PRESETS[0])
      setError('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Name is required'); return }
    setIsSubmitting(true)
    try {
      if (editing) {
        await updateGroup(editing.id, { name: trimmed, color })
      } else {
        await createGroup({ name: trimmed, color })
      }
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <form onSubmit={handleSubmit}>
        <DialogHeader
          title={editing ? 'Edit Group' : 'New Group'}
          onClose={onClose}
        />
        <DialogBody className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-shelf-text-muted mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              ref={inputRef}
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Work, Client A…"
              maxLength={100}
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-shelf-text-muted mb-1.5">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? 'white' : 'transparent',
                    boxShadow: color === c ? `0 0 0 1px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
