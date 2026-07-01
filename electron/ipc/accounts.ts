import { ipcMain } from 'electron'
import { DatabaseService } from '../database'
import {
  AccountFilters,
  AccountStatus,
  CreateAccountInput,
  SortField,
  SortOrder,
  UpdateAccountInput,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES: AccountStatus[] = ['active', 'exhausted', 'waiting-reset', 'dead', 'archived']
const VALID_SORT_FIELDS: SortField[]  = ['created_at', 'updated_at', 'status', 'email', 'last_used_at']
const VALID_SORT_ORDERS: SortOrder[]  = ['asc', 'desc']

// ─── Input validators ─────────────────────────────────────────────────────────

export function validateCreateInput(input: unknown): CreateAccountInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>

  if (typeof i.email !== 'string' || !i.email.trim()) throw new Error('Invalid email')
  if (i.email.length > 320)                           throw new Error('Email too long')
  if (i.password !== undefined && typeof i.password !== 'string') throw new Error('Invalid password')
  if (i.provider !== undefined && typeof i.provider !== 'string') throw new Error('Invalid provider')
  if (i.notes   !== undefined && typeof i.notes   !== 'string')   throw new Error('Invalid notes')
  if (i.notes   && (i.notes as string).length > 10_000)           throw new Error('Notes too long')
  if (i.tags    !== undefined && !Array.isArray(i.tags))          throw new Error('Invalid tags')
  if (i.status  !== undefined && !VALID_STATUSES.includes(i.status as AccountStatus)) {
    throw new Error('Invalid status')
  }

  return {
    email:    (i.email as string).trim().toLowerCase(),
    password: (i.password as string)     ?? '',
    provider: (i.provider as string)     ?? 'gmail',
    notes:    (i.notes as string)        ?? '',
    tags:     (i.tags as string[])       ?? [],
    status:   (i.status as AccountStatus) ?? 'active',
  }
}

export function validateUpdateInput(input: UpdateAccountInput): UpdateAccountInput {
  const safe: UpdateAccountInput = {}

  if (input.email !== undefined) {
    if (typeof input.email !== 'string') throw new Error('Invalid email')
    safe.email = input.email.trim().toLowerCase()
  }

  if (input.password !== undefined) safe.password = String(input.password)
  if (input.provider !== undefined) safe.provider = String(input.provider)

  if (input.notes !== undefined) {
    if (typeof input.notes !== 'string')    throw new Error('Invalid notes')
    if (input.notes.length > 10_000)        throw new Error('Notes too long')
    safe.notes = input.notes
  }

  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) throw new Error('Invalid tags')
    safe.tags = input.tags.filter(t => typeof t === 'string')
  }

  if (input.status !== undefined) {
    if (!VALID_STATUSES.includes(input.status)) throw new Error('Invalid status')
    safe.status = input.status
  }

  if (input.last_used_at !== undefined) safe.last_used_at = input.last_used_at

  return safe
}

export function validateFilters(filters: unknown): AccountFilters {
  if (!filters || typeof filters !== 'object') return {}
  const f = filters as Record<string, unknown>

  return {
    search:    typeof f.search    === 'string' ? f.search.slice(0, 200) : '',
    status:    VALID_STATUSES.includes(f.status as AccountStatus) ? f.status as AccountStatus : 'all',
    provider:  typeof f.provider  === 'string' ? f.provider.slice(0, 50) : '',
    tags:      Array.isArray(f.tags)
                 ? (f.tags as string[]).filter(t => typeof t === 'string').slice(0, 20)
                 : [],
    groupId:   typeof f.groupId   === 'string' ? f.groupId : null,
    sortBy:    VALID_SORT_FIELDS.includes(f.sortBy as SortField)    ? f.sortBy    as SortField  : 'created_at',
    sortOrder: VALID_SORT_ORDERS.includes(f.sortOrder as SortOrder) ? f.sortOrder as SortOrder  : 'desc',
  }
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

export function registerAccountsIpc(getDb: () => DatabaseService | null) {
  const db = () => {
    const instance = getDb()
    if (!instance) throw new Error('Database not initialized')
    return instance
  }

  const validId = (id: unknown) => {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid id')
    return id
  }

  ipcMain.handle('accounts:getAll', (_e, filters: unknown) =>
    db().getAccounts(validateFilters(filters))
  )

  ipcMain.handle('accounts:getById', (_e, id: unknown) =>
    db().getAccountById(validId(id))
  )

  ipcMain.handle('accounts:create', (_e, input: unknown) =>
    db().createAccount(validateCreateInput(input))
  )

  ipcMain.handle('accounts:update', (_e, id: unknown, input: UpdateAccountInput) =>
    db().updateAccount(validId(id), validateUpdateInput(input))
  )

  ipcMain.handle('accounts:delete', (_e, id: unknown) =>
    db().deleteAccount(validId(id))
  )

  ipcMain.handle('accounts:bulkDelete', (_e, ids: unknown) => {
    if (!Array.isArray(ids)) throw new Error('Invalid ids')
    return db().bulkDeleteAccounts(ids.filter(id => typeof id === 'string' && id.trim()))
  })

  ipcMain.handle('accounts:bulkUpdateStatus', (_e, ids: unknown, status: unknown) => {
    if (!Array.isArray(ids)) throw new Error('Invalid ids')
    if (!VALID_STATUSES.includes(status as AccountStatus)) throw new Error('Invalid status')
    return db().bulkUpdateStatus(
      ids.filter(id => typeof id === 'string' && id.trim()),
      status as AccountStatus,
    )
  })

  ipcMain.handle('accounts:bulkUpdateTag', (_e, ids: unknown, tag: unknown, mode: unknown) => {
    if (!Array.isArray(ids))                        throw new Error('Invalid ids')
    if (typeof tag !== 'string' || !tag.trim())     throw new Error('Invalid tag')
    if (mode !== 'add' && mode !== 'remove')        throw new Error('Invalid mode')
    return db().bulkUpdateTag(
      ids.filter(id => typeof id === 'string' && id.trim()),
      tag.trim().toLowerCase().slice(0, 100),
      mode,
    )
  })

  ipcMain.handle('accounts:getStats',     () => db().getStats())
  ipcMain.handle('accounts:getTags',      () => db().getAllTags())
  ipcMain.handle('accounts:getTagCounts', () => db().getTagCounts())
}
