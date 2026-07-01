import { ipcMain } from 'electron'
import { DatabaseService } from '../database'
import {
  AccountStatus,
  TagRuleTrigger,
  CreateTagRuleInput,
  UpdateTagRuleInput,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES: AccountStatus[]  = ['active', 'exhausted', 'waiting-reset', 'dead', 'archived']
const VALID_TRIGGERS: TagRuleTrigger[] = ['after_days', 'day_of_month', 'day_of_week']

// ─── Input validators ─────────────────────────────────────────────────────────

/** Validates trigger_value range for a given trigger type. */
function validateTriggerValue(trigger: TagRuleTrigger, val: number): void {
  if (!Number.isInteger(val))                          throw new Error('trigger_value must be integer')
  if (trigger === 'after_days'   && (val < 1 || val > 3650)) throw new Error('after_days must be 1–3650')
  if (trigger === 'day_of_month' && (val < 1 || val > 28))   throw new Error('day_of_month must be 1–28')
  if (trigger === 'day_of_week'  && (val < 0 || val > 6))    throw new Error('day_of_week must be 0–6')
}

function validateCreateInput(input: unknown): CreateTagRuleInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>

  if (typeof i.tag !== 'string' || !i.tag.trim())              throw new Error('Invalid tag')
  if ((i.tag as string).length > 100)                          throw new Error('Tag too long')
  if (!VALID_STATUSES.includes(i.from_status as AccountStatus)) throw new Error('Invalid from_status')
  if (!VALID_STATUSES.includes(i.to_status   as AccountStatus)) throw new Error('Invalid to_status')
  if (!VALID_TRIGGERS.includes(i.trigger     as TagRuleTrigger)) throw new Error('Invalid trigger')

  const trigger = i.trigger as TagRuleTrigger
  const val     = Number(i.trigger_value)
  validateTriggerValue(trigger, val)

  return {
    tag:           i.tag.trim().toLowerCase(),
    from_status:   i.from_status as AccountStatus,
    to_status:     i.to_status   as AccountStatus,
    trigger,
    trigger_value: val,
    enabled:       i.enabled !== false,
  }
}

function validateUpdateInput(input: unknown): UpdateTagRuleInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>
  const safe: UpdateTagRuleInput = {}

  if (i.tag !== undefined) {
    if (typeof i.tag !== 'string' || !i.tag.trim()) throw new Error('Invalid tag')
    safe.tag = i.tag.trim().toLowerCase()
  }

  if (i.from_status !== undefined) {
    if (!VALID_STATUSES.includes(i.from_status as AccountStatus)) throw new Error('Invalid from_status')
    safe.from_status = i.from_status as AccountStatus
  }

  if (i.to_status !== undefined) {
    if (!VALID_STATUSES.includes(i.to_status as AccountStatus)) throw new Error('Invalid to_status')
    safe.to_status = i.to_status as AccountStatus
  }

  if (i.trigger !== undefined) {
    if (!VALID_TRIGGERS.includes(i.trigger as TagRuleTrigger)) throw new Error('Invalid trigger')
    safe.trigger = i.trigger as TagRuleTrigger
  }

  if (i.trigger_value !== undefined) {
    const trigger = (safe.trigger ?? i.trigger) as TagRuleTrigger | undefined
    const val     = Number(i.trigger_value)
    if (trigger) validateTriggerValue(trigger, val)
    else if (!Number.isInteger(val)) throw new Error('trigger_value must be integer')
    safe.trigger_value = val
  }

  if (i.enabled !== undefined) safe.enabled = Boolean(i.enabled)

  return safe
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

export function registerTagRulesIpc(getDb: () => DatabaseService | null) {
  const db = () => {
    const instance = getDb()
    if (!instance) throw new Error('Database not initialized')
    return instance
  }

  const validId = (id: unknown) => {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid id')
    return id
  }

  ipcMain.handle('tagRules:getAll', () => db().getTagRules())

  ipcMain.handle('tagRules:create', (_e, input: unknown) =>
    db().createTagRule(validateCreateInput(input))
  )

  ipcMain.handle('tagRules:update', (_e, id: unknown, input: unknown) =>
    db().updateTagRule(validId(id), validateUpdateInput(input))
  )

  ipcMain.handle('tagRules:delete', (_e, id: unknown) =>
    db().deleteTagRule(validId(id))
  )

  ipcMain.handle('tagRules:run', () => db().runTagRules())
}
