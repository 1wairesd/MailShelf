import { ipcMain } from 'electron'
import { DatabaseService } from '../database'
import { CreateGroupInput, UpdateGroupInput } from '../types'

const GROUP_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/

function validateCreateInput(input: unknown): CreateGroupInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>
  if (typeof i.name !== 'string' || !i.name.trim()) throw new Error('Name is required')
  if (i.name.length > 100) throw new Error('Name too long')
  if (i.color !== undefined && (typeof i.color !== 'string' || !GROUP_COLOR_RE.test(i.color))) {
    throw new Error('Invalid color')
  }
  return {
    name: (i.name as string).trim(),
    color: typeof i.color === 'string' ? i.color : undefined,
    position: typeof i.position === 'number' ? Math.floor(i.position) : undefined,
  }
}

function validateUpdateInput(input: unknown): UpdateGroupInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid input')
  const i = input as Record<string, unknown>
  const safe: UpdateGroupInput = {}
  if (i.name !== undefined) {
    if (typeof i.name !== 'string' || !i.name.trim()) throw new Error('Invalid name')
    if ((i.name as string).length > 100) throw new Error('Name too long')
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

export function registerGroupsIpc(getDb: () => DatabaseService | null) {
  const db = () => {
    const instance = getDb()
    if (!instance) throw new Error('Database not initialized')
    return instance
  }

  ipcMain.handle('groups:getAll', () => db().getGroups())

  ipcMain.handle('groups:getCounts', () => db().getGroupCounts())

  ipcMain.handle('groups:create', (_e, input: unknown) =>
    db().createGroup(validateCreateInput(input))
  )

  ipcMain.handle('groups:update', (_e, id: string, input: unknown) => {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid id')
    return db().updateGroup(id, validateUpdateInput(input))
  })

  ipcMain.handle('groups:delete', (_e, id: string) => {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid id')
    return db().deleteGroup(id)
  })

  ipcMain.handle('groups:addAccounts', (_e, groupId: string, accountIds: string[]) => {
    if (typeof groupId !== 'string' || !groupId.trim()) throw new Error('Invalid groupId')
    if (!Array.isArray(accountIds)) throw new Error('Invalid accountIds')
    return db().addAccountsToGroup(groupId, accountIds.filter(id => typeof id === 'string' && id.trim()))
  })

  ipcMain.handle('groups:removeAccounts', (_e, groupId: string, accountIds: string[]) => {
    if (typeof groupId !== 'string' || !groupId.trim()) throw new Error('Invalid groupId')
    if (!Array.isArray(accountIds)) throw new Error('Invalid accountIds')
    return db().removeAccountsFromGroup(groupId, accountIds.filter(id => typeof id === 'string' && id.trim()))
  })

  ipcMain.handle('groups:moveAccounts', (_e, groupId: string | null, accountIds: string[]) => {
    if (groupId !== null && (typeof groupId !== 'string' || !groupId.trim())) throw new Error('Invalid groupId')
    if (!Array.isArray(accountIds)) throw new Error('Invalid accountIds')
    return db().moveAccountsToGroup(
      groupId,
      accountIds.filter(id => typeof id === 'string' && id.trim())
    )
  })

  ipcMain.handle('groups:getAccountGroups', (_e, accountId: string) => {
    if (typeof accountId !== 'string' || !accountId.trim()) throw new Error('Invalid accountId')
    return db().getAccountGroups(accountId)
  })
}
