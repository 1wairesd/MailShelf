import { create } from 'zustand'
import { api } from '../lib/api'
import type { Group, CreateGroupInput, UpdateGroupInput } from '../../shared/types'

interface GroupsStore {
  groups: Group[]
  groupCounts: Record<string, number>
  isLoading: boolean

  loadGroups: () => Promise<void>
  loadGroupCounts: () => Promise<void>
  createGroup: (input: CreateGroupInput) => Promise<Group | null>
  updateGroup: (id: string, input: UpdateGroupInput) => Promise<Group | null>
  deleteGroup: (id: string) => Promise<boolean>
  addAccountsToGroup: (groupId: string, accountIds: string[]) => Promise<number>
  removeAccountsFromGroup: (groupId: string, accountIds: string[]) => Promise<number>
  moveAccountsToGroup: (groupId: string | null, accountIds: string[]) => Promise<number>
}

export const useGroupsStore = create<GroupsStore>((set, get) => ({
  groups: [],
  groupCounts: {},
  isLoading: false,

  loadGroups: async () => {
    set({ isLoading: true })
    try {
      const groups = await api.groups.getAll()
      set({ groups, isLoading: false })
    } catch (err) {
      console.error('[groupsStore] loadGroups failed:', err)
      set({ isLoading: false })
    }
  },

  loadGroupCounts: async () => {
    try {
      const groupCounts = await api.groups.getCounts()
      set({ groupCounts })
    } catch (err) {
      console.error('[groupsStore] loadGroupCounts failed:', err)
    }
  },

  createGroup: async (input) => {
    try {
      const group = await api.groups.create(input)
      await get().loadGroups()
      await get().loadGroupCounts()
      return group
    } catch (err) {
      console.error('[groupsStore] createGroup failed:', err)
      return null
    }
  },

  updateGroup: async (id, input) => {
    try {
      const group = await api.groups.update(id, input)
      await get().loadGroups()
      return group
    } catch (err) {
      console.error('[groupsStore] updateGroup failed:', err)
      return null
    }
  },

  deleteGroup: async (id) => {
    try {
      const ok = await api.groups.delete(id)
      if (ok) {
        await get().loadGroups()
        await get().loadGroupCounts()
      }
      return ok
    } catch (err) {
      console.error('[groupsStore] deleteGroup failed:', err)
      return false
    }
  },

  addAccountsToGroup: async (groupId, accountIds) => {
    try {
      const count = await api.groups.addAccounts(groupId, accountIds)
      await get().loadGroupCounts()
      return count
    } catch (err) {
      console.error('[groupsStore] addAccountsToGroup failed:', err)
      return 0
    }
  },

  removeAccountsFromGroup: async (groupId, accountIds) => {
    try {
      const count = await api.groups.removeAccounts(groupId, accountIds)
      await get().loadGroupCounts()
      return count
    } catch (err) {
      console.error('[groupsStore] removeAccountsFromGroup failed:', err)
      return 0
    }
  },

  moveAccountsToGroup: async (groupId, accountIds) => {
    try {
      const count = await api.groups.moveAccounts(groupId, accountIds)
      await get().loadGroups()
      await get().loadGroupCounts()
      return count
    } catch (err) {
      console.error('[groupsStore] moveAccountsToGroup failed:', err)
      return 0
    }
  },
}))
