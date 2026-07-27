import { ipcMain } from 'electron'
import { DatabaseService } from '../database'
import { CreateGroupInput, UpdateGroupInput } from '../types'
import { validId, validIds, ensureDb } from './validators'

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUP_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/

// ─── Input validators ─────────────────────────────────────────────────────────

function validateCreateInput(input: unknown): CreateGroupInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>

  if (typeof i.name !== 'string' || !i.name.trim()) throw new Error('Name is required')
  if ((i.name as string).length > 100)              throw new Error('Name too long')
  if (i.color !== undefined && (typeof i.color !== 'string' || !GROUP_COLOR_RE.test(i.color))) {
    throw new Error('Invalid color')
  }

  return {
    name:     (i.name as string).trim(),
    color:    typeof i.color    === 'string' ? i.color             : undefined,
    position: typeof i.position === 'number' ? Math.floor(i.position) : undefined,
  }
}

function validateUpdateInput(input: unknown): UpdateGroupInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>
  const safe: UpdateGroupInput = {}

  if (i.name !== undefined) {
    if (typeof i.name !== 'string' || !i.name.trim()) throw new Error('Invalid name')
    if ((i.name as string).length > 100)              throw new Error('Name too long')
    safe.name = (i.name as string).trim()
  }

  if (i.color !== undefined) {
    if (typeof i.color !== 'string' || !GROUP_COLOR_RE.test(i.color)) throw new Error('Invalid color')
    safe.color = i.color
  }

  if (i.position !== undefined) {
    if (typeof i.position !== 'number') throw new Error('Invalid position')
    safe.position = Math.floor(i.position)
  }

  return safe
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

export function registerGroupsIpc(getDb: () => DatabaseService | null) {
  const db = () => ensureDb(getDb)

  ipcMain.handle('groups:getAll',    () => db().getGroups())
  ipcMain.handle('groups:getCounts', () => db().getGroupCounts())

  ipcMain.handle('groups:create', (_e, input: unknown) =>
    db().createGroup(validateCreateInput(input))
  )

  ipcMain.handle('groups:update', (_e, id: unknown, input: unknown) =>
    db().updateGroup(validId(id), validateUpdateInput(input))
  )

  ipcMain.handle('groups:delete', (_e, id: unknown) =>
    db().deleteGroup(validId(id))
  )

  ipcMain.handle('groups:addAccounts', (_e, groupId: unknown, accountIds: unknown) =>
    db().addAccountsToGroup(validId(groupId, 'groupId'), validIds(accountIds))
  )

  ipcMain.handle('groups:removeAccounts', (_e, groupId: unknown, accountIds: unknown) =>
    db().removeAccountsFromGroup(validId(groupId, 'groupId'), validIds(accountIds))
  )

  ipcMain.handle('groups:moveAccounts', (_e, groupId: unknown, accountIds: unknown) => {
    if (groupId !== null) validId(groupId, 'groupId')
    return db().moveAccountsToGroup(groupId as string | null, validIds(accountIds))
  })

  ipcMain.handle('groups:getAccountGroups', (_e, accountId: unknown) =>
    db().getAccountGroups(validId(accountId, 'accountId'))
  )
}
