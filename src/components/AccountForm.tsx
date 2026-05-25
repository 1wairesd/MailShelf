import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAccountStore } from '@/store/accountStore'
import { AccountStatus, PROVIDER_OPTIONS, STATUS_CONFIG } from '@/types'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { TagInput } from './TagInput'
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
  const { isFormOpen, editingAccount, closeForm, createAccount, updateAccount, allTags } = useAccountStore()
  const { toast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [showPassword, setShowPassword] = useState(false)
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
      setErrors({})
      setShowPassword(false)
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
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Password or app password"
                className="font-mono pr-9"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-shelf-text-subtle hover:text-shelf-text transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
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
            <TagInput
              tags={form.tags}
              allTags={allTags}
              onChange={tags => setForm(f => ({ ...f, tags }))}
              placeholder="Add tags… (Enter or ,)"
            />
            <p className="text-[10px] text-shelf-text-subtle mt-1">
              Start typing to search existing tags or create new ones
            </p>
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
