import React, { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { AccountStatus, PROVIDER_OPTIONS, STATUS_CONFIG } from '@/types'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { TagBadge } from './TagBadge'
import { useToast } from './ui/toast'

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

interface FormState {
  email: string
  password: string
  provider: string
  notes: string
  tags: string[]
  status: AccountStatus
}

const defaultForm: FormState = {
  email: '',
  password: '',
  provider: 'gmail',
  notes: '',
  tags: [],
  status: 'active',
}

export function AccountForm() {
  const { isFormOpen, editingAccount, closeForm, createAccount, updateAccount } = useAccountStore()
  const { toast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  const isEditing = !!editingAccount

  useEffect(() => {
    if (isFormOpen) {
      if (editingAccount) {
        setForm({
          email: editingAccount.email,
          password: editingAccount.password,
          provider: editingAccount.provider,
          notes: editingAccount.notes,
          tags: [...editingAccount.tags],
          status: editingAccount.status,
        })
      } else {
        setForm(defaultForm)
      }
      setTagInput('')
      setErrors({})
      setTimeout(() => emailRef.current?.focus(), 50)
    }
  }, [isFormOpen, editingAccount])

  const validate = (): boolean => {
    const newErrors: typeof errors = {}
    if (!form.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Invalid email format'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      if (isEditing && editingAccount) {
        const result = await updateAccount(editingAccount.id, {
          email: form.email.trim(),
          password: form.password,
          provider: form.provider,
          notes: form.notes,
          tags: form.tags,
          status: form.status,
        })
        if (result) {
          toast('Account updated', 'success')
          closeForm()
        } else {
          toast('Failed to update account — check console', 'error')
        }
      } else {
        const result = await createAccount({
          email: form.email.trim(),
          password: form.password,
          provider: form.provider,
          notes: form.notes,
          tags: form.tags,
          status: form.status,
        })
        if (result) {
          toast('Account created', 'success')
          closeForm()
        } else {
          toast('Failed to create account — check console', 'error')
        }
      }
    } catch (err) {
      console.error('[AccountForm] submit error:', err)
      toast(String(err), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1])
    }
  }

  return (
    <Dialog open={isFormOpen} onClose={closeForm} className="max-w-md">
      <form onSubmit={handleSubmit}>
        <DialogHeader
          title={isEditing ? 'Edit Account' : 'Add Account'}
          description={isEditing ? 'Update account details' : 'Add a new account to your shelf'}
          onClose={closeForm}
        />

        <DialogBody className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-shelf-text-muted mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <Input
              ref={emailRef}
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@gmail.com"
              className={errors.email ? 'border-red-500/50 focus:ring-red-500' : ''}
              autoComplete="off"
            />
            {errors.email && (
              <p className="text-xs text-red-400 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-shelf-text-muted mb-1.5">
              Password
            </label>
            <Input
              type="text"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Password or app password"
              className="font-mono"
              autoComplete="off"
            />
          </div>

          {/* Provider + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-shelf-text-muted mb-1.5">
                Provider
              </label>
              <Select
                value={form.provider}
                onChange={v => setForm(f => ({ ...f, provider: v }))}
                options={PROVIDER_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-shelf-text-muted mb-1.5">
                Status
              </label>
              <Select
                value={form.status}
                onChange={v => setForm(f => ({ ...f, status: v as AccountStatus }))}
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-shelf-text-muted mb-1.5">
              Tags
            </label>
            <div className="min-h-[36px] flex flex-wrap gap-1.5 p-2 rounded-md border border-shelf-border bg-shelf-surface focus-within:ring-1 focus-within:ring-shelf-accent focus-within:border-shelf-accent transition-colors">
              {form.tags.map(tag => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  onRemove={() => removeTag(tag)}
                  size="sm"
                />
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                placeholder={form.tags.length === 0 ? 'Add tags… (Enter or comma)' : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-shelf-text placeholder:text-shelf-text-subtle outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-shelf-text-muted mb-1.5">
              Notes
            </label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes, recovery codes, or comments…"
              rows={3}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeForm} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Account'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
