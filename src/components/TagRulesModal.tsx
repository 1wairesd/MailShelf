import { useEffect, useState } from 'react'
import { Plus, Trash2, Play, X, Pencil, Check, Clock, Calendar, Hash, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTagRulesStore } from '@/store/tagRulesStore'
import { useAccountStore } from '@/store/accountStore'
import { Button } from './ui/button'
import { useToast } from './ui/toast'
import type { TagRule, CreateTagRuleInput, TagRuleTrigger } from '../../shared/types'
import { AccountStatus, STATUS_CONFIG } from '@/types'

interface TagRulesModalProps {
  open: boolean
  onClose: () => void
}

const TRIGGER_OPTIONS: { value: TagRuleTrigger; label: string; description: string }[] = [
  {
    value: 'after_days',
    label: 'After N days',
    description: 'N days after the account status was last changed',
  },
  {
    value: 'day_of_month',
    label: 'Day of month',
    description: 'On a specific day of each month (1–28)',
  },
  {
    value: 'day_of_week',
    label: 'Day of week',
    description: 'On a specific weekday each week',
  },
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value: value as AccountStatus,
  label: cfg.label,
  dotColor: cfg.dotColor,
}))

function triggerLabel(rule: TagRule): string {
  if (rule.trigger === 'after_days') {
    return `After ${rule.trigger_value} day${rule.trigger_value !== 1 ? 's' : ''}`
  }
  if (rule.trigger === 'day_of_month') {
    const n = rule.trigger_value
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
    return `Every month on the ${n}${suffix}`
  }
  if (rule.trigger === 'day_of_week') {
    return `Every ${DAY_NAMES[rule.trigger_value] ?? '?'}`
  }
  return '—'
}

// ─── Rule Form ────────────────────────────────────────────────────────────────

interface RuleFormProps {
  allTags: string[]
  initial?: TagRule
  onSave: (input: CreateTagRuleInput) => Promise<void>
  onCancel: () => void
}

function RuleForm({ allTags, initial, onSave, onCancel }: RuleFormProps) {
  const [tag, setTag] = useState(initial?.tag ?? '')
  const [fromStatus, setFromStatus] = useState<AccountStatus>(initial?.from_status ?? 'waiting-reset')
  const [toStatus, setToStatus] = useState<AccountStatus>(initial?.to_status ?? 'active')
  const [trigger, setTrigger] = useState<TagRuleTrigger>(initial?.trigger ?? 'after_days')
  const [triggerValue, setTriggerValue] = useState(initial?.trigger_value ?? 30)
  const [saving, setSaving] = useState(false)

  const triggerMin = trigger === 'after_days' ? 1 : trigger === 'day_of_month' ? 1 : 0
  const triggerMax = trigger === 'after_days' ? 3650 : trigger === 'day_of_month' ? 28 : 6

  const handleTriggerChange = (t: TagRuleTrigger) => {
    setTrigger(t)
    // Reset to sensible default for the new trigger type
    if (t === 'after_days') setTriggerValue(30)
    else if (t === 'day_of_month') setTriggerValue(1)
    else setTriggerValue(1) // Monday
  }

  const handleSubmit = async () => {
    if (!tag.trim()) return
    setSaving(true)
    await onSave({ tag: tag.trim().toLowerCase(), from_status: fromStatus, to_status: toStatus, trigger, trigger_value: triggerValue })
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tag */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
          Tag
        </label>
        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(t => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors',
                  tag === t
                    ? 'bg-shelf-accent/20 border-shelf-accent text-shelf-accent'
                    : 'border-shelf-border text-shelf-text-muted hover:border-shelf-accent/50 hover:text-shelf-text'
                )}
              >
                <Hash size={9} />
                {t}
              </button>
            ))}
          </div>
        ) : null}
        <input
          value={tag}
          onChange={e => setTag(e.target.value)}
          placeholder="or type a tag name…"
          className="mt-2 w-full bg-shelf-elevated border border-shelf-border rounded-md px-3 py-1.5 text-sm text-shelf-text placeholder:text-shelf-text-subtle focus:outline-none focus:border-shelf-accent transition-colors"
        />
      </div>

      {/* From → To status */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
            When status is
          </label>
          <select
            value={fromStatus}
            onChange={e => setFromStatus(e.target.value as AccountStatus)}
            className="w-full bg-shelf-elevated border border-shelf-border rounded-md px-3 py-1.5 text-sm text-shelf-text focus:outline-none focus:border-shelf-accent transition-colors"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <ChevronRight size={16} className="text-shelf-text-subtle mt-5 shrink-0" />

        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
            Change to
          </label>
          <select
            value={toStatus}
            onChange={e => setToStatus(e.target.value as AccountStatus)}
            className="w-full bg-shelf-elevated border border-shelf-border rounded-md px-3 py-1.5 text-sm text-shelf-text focus:outline-none focus:border-shelf-accent transition-colors"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Trigger type */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
          Schedule
        </label>
        <div className="flex flex-col gap-1.5">
          {TRIGGER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleTriggerChange(opt.value)}
              className={cn(
                'flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                trigger === opt.value
                  ? 'border-shelf-accent bg-shelf-accent/8 text-shelf-text'
                  : 'border-shelf-border hover:border-shelf-border text-shelf-text-muted hover:bg-shelf-elevated'
              )}
            >
              <div className={cn(
                'mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center',
                trigger === opt.value ? 'border-shelf-accent' : 'border-shelf-border'
              )}>
                {trigger === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-shelf-accent" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-shelf-text-subtle mt-0.5">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trigger value */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-shelf-text-subtle mb-1.5">
          {trigger === 'after_days' && 'Number of days'}
          {trigger === 'day_of_month' && 'Day of month (1–28)'}
          {trigger === 'day_of_week' && 'Weekday'}
        </label>

        {trigger === 'day_of_week' ? (
          <div className="flex gap-1.5 flex-wrap">
            {DAY_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => setTriggerValue(i)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                  triggerValue === i
                    ? 'bg-shelf-accent/20 border-shelf-accent text-shelf-accent'
                    : 'border-shelf-border text-shelf-text-muted hover:bg-shelf-elevated'
                )}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={triggerMin}
              max={triggerMax}
              value={triggerValue}
              onChange={e => setTriggerValue(Math.max(triggerMin, Math.min(triggerMax, Number(e.target.value))))}
              className="w-24 bg-shelf-elevated border border-shelf-border rounded-md px-3 py-1.5 text-sm text-shelf-text focus:outline-none focus:border-shelf-accent transition-colors"
            />
            <span className="text-sm text-shelf-text-subtle">
              {trigger === 'after_days' && `day${triggerValue !== 1 ? 's' : ''} after status change`}
              {trigger === 'day_of_month' && `of each month`}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={!tag.trim() || saving}
          className="flex-1 gap-1.5"
        >
          {saving ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <Check size={13} />
          )}
          {initial ? 'Save changes' : 'Create rule'}
        </Button>
      </div>
    </div>
  )
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: TagRule
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}

function RuleCard({ rule, onEdit, onDelete, onToggle }: RuleCardProps) {
  const fromCfg = STATUS_CONFIG[rule.from_status]
  const toCfg = STATUS_CONFIG[rule.to_status]

  return (
    <div className={cn(
      'flex flex-col gap-2 p-3 rounded-lg border transition-colors',
      rule.enabled ? 'border-shelf-border bg-shelf-elevated/30' : 'border-shelf-border/50 bg-shelf-elevated/10 opacity-60'
    )}>
      <div className="flex items-start gap-2">
        {/* Enable toggle */}
        <button
          onClick={onToggle}
          title={rule.enabled ? 'Disable rule' : 'Enable rule'}
          className={cn(
            'relative shrink-0 mt-0.5 rounded-full transition-colors duration-200 focus:outline-none',
            rule.enabled ? 'bg-shelf-accent' : 'bg-shelf-border'
          )}
          style={{ width: 28, height: 16 }}
        >
          <span
            className="absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: rule.enabled ? 'translateX(12px)' : 'translateX(0)' }}
          />
        </button>

        <div className="flex-1 min-w-0">
          {/* Tag + trigger */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-mono bg-shelf-elevated px-2 py-0.5 rounded-full border border-shelf-border text-shelf-text">
              <Hash size={9} className="text-shelf-accent" />
              {rule.tag}
            </span>
            <span className="flex items-center gap-1 text-xs text-shelf-text-muted">
              <Clock size={10} />
              {triggerLabel(rule)}
            </span>
          </div>

          {/* Status transition */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', fromCfg.bgColor, fromCfg.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', fromCfg.dotColor)} />
              {fromCfg.label}
            </span>
            <ChevronRight size={12} className="text-shelf-text-subtle" />
            <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', toCfg.bgColor, toCfg.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', toCfg.dotColor)} />
              {toCfg.label}
            </span>
          </div>

          {rule.last_run_at && (
            <p className="text-[10px] text-shelf-text-subtle mt-1">
              Last run: {new Date(rule.last_run_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-border transition-colors"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-shelf-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function TagRulesModal({ open, onClose }: TagRulesModalProps) {
  const { rules, isLoading, lastRunResults, loadRules, createRule, updateRule, deleteRule, runRules } = useTagRulesStore()
  const { allTags, loadAccounts, loadStats } = useAccountStore()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<TagRule | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (open) {
      loadRules()
    }
  }, [open])

  if (!open) return null

  const handleCreate = async (input: CreateTagRuleInput) => {
    const rule = await createRule(input)
    if (rule) {
      toast('Rule created', 'success')
      setShowForm(false)
    } else {
      toast('Failed to create rule', 'error')
    }
  }

  const handleEdit = async (input: CreateTagRuleInput) => {
    if (!editingRule) return
    const rule = await updateRule(editingRule.id, input)
    if (rule) {
      toast('Rule updated', 'success')
      setEditingRule(null)
    } else {
      toast('Failed to update rule', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteRule(id)
    if (ok) toast('Rule deleted', 'info')
  }

  const handleToggle = async (rule: TagRule) => {
    await updateRule(rule.id, { enabled: !rule.enabled })
  }

  const handleRunNow = async () => {
    setRunning(true)
    const results = await runRules()
    await loadAccounts()
    await loadStats()
    setRunning(false)
    const total = results.reduce((s, r) => s + r.affected, 0)
    if (total > 0) {
      toast(`Rules applied: ${total} account${total !== 1 ? 's' : ''} updated`, 'success')
    } else {
      toast('Rules ran — no accounts matched', 'info')
    }
  }

  const isFormOpen = showForm || editingRule !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-shelf-surface border border-shelf-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-shelf-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-shelf-text">Tag Rules</h2>
            <p className="text-xs text-shelf-text-subtle mt-0.5">
              Auto-change account status based on tag + schedule
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunNow}
              disabled={running || rules.length === 0}
              className="gap-1.5 text-xs"
            >
              {running ? (
                <span className="animate-spin text-base leading-none">⟳</span>
              ) : (
                <Play size={11} />
              )}
              Run now
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-shelf-text-subtle hover:text-shelf-text hover:bg-shelf-elevated transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Last run summary */}
          {lastRunResults && lastRunResults.some(r => r.affected > 0) && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-shelf-accent/10 border border-shelf-accent/20 text-xs text-shelf-accent flex items-center gap-2">
              <Check size={12} />
              Last run updated {lastRunResults.reduce((s, r) => s + r.affected, 0)} account(s)
            </div>
          )}

          {/* Form */}
          {isFormOpen && (
            <div className="mb-4 p-4 rounded-lg border border-shelf-accent/30 bg-shelf-elevated/50">
              <h3 className="text-xs font-semibold text-shelf-text mb-3">
                {editingRule ? 'Edit rule' : 'New rule'}
              </h3>
              <RuleForm
                allTags={allTags}
                initial={editingRule ?? undefined}
                onSave={editingRule ? handleEdit : handleCreate}
                onCancel={() => { setShowForm(false); setEditingRule(null) }}
              />
            </div>
          )}

          {/* Rules list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-shelf-text-subtle text-sm">
              Loading…
            </div>
          ) : rules.length === 0 && !isFormOpen ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-shelf-elevated flex items-center justify-center">
                <Calendar size={18} className="text-shelf-text-subtle" />
              </div>
              <div>
                <p className="text-sm font-medium text-shelf-text-muted">No rules yet</p>
                <p className="text-xs text-shelf-text-subtle mt-1">
                  Create a rule to automatically change account status on a schedule
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => { setEditingRule(rule); setShowForm(false) }}
                  onDelete={() => handleDelete(rule.id)}
                  onToggle={() => handleToggle(rule)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isFormOpen && (
          <div className="px-5 py-3 border-t border-shelf-border shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={() => { setShowForm(true); setEditingRule(null) }}
              className="w-full gap-1.5"
            >
              <Plus size={13} />
              Add rule
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
