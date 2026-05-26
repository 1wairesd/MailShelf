import { create } from 'zustand'
import { api } from '../lib/api'
import type { TagRule, CreateTagRuleInput, UpdateTagRuleInput, TagRuleRunResult } from '../../shared/types'

interface TagRulesStore {
  rules: TagRule[]
  isLoading: boolean
  lastRunResults: TagRuleRunResult[] | null

  loadRules: () => Promise<void>
  createRule: (input: CreateTagRuleInput) => Promise<TagRule | null>
  updateRule: (id: string, input: UpdateTagRuleInput) => Promise<TagRule | null>
  deleteRule: (id: string) => Promise<boolean>
  runRules: () => Promise<TagRuleRunResult[]>
  setLastRunResults: (results: TagRuleRunResult[]) => void
}

export const useTagRulesStore = create<TagRulesStore>((set, get) => ({
  rules: [],
  isLoading: false,
  lastRunResults: null,

  loadRules: async () => {
    set({ isLoading: true })
    try {
      const rules = await api.tagRules.getAll()
      set({ rules, isLoading: false })
    } catch (err) {
      console.error('[tagRulesStore] loadRules failed:', err)
      set({ isLoading: false })
    }
  },

  createRule: async (input) => {
    try {
      const rule = await api.tagRules.create(input)
      await get().loadRules()
      return rule
    } catch (err) {
      console.error('[tagRulesStore] createRule failed:', err)
      return null
    }
  },

  updateRule: async (id, input) => {
    try {
      const rule = await api.tagRules.update(id, input)
      await get().loadRules()
      return rule
    } catch (err) {
      console.error('[tagRulesStore] updateRule failed:', err)
      return null
    }
  },

  deleteRule: async (id) => {
    try {
      const ok = await api.tagRules.delete(id)
      if (ok) await get().loadRules()
      return ok
    } catch (err) {
      console.error('[tagRulesStore] deleteRule failed:', err)
      return false
    }
  },

  runRules: async () => {
    try {
      const results = await api.tagRules.run()
      set({ lastRunResults: results })
      await get().loadRules()
      return results
    } catch (err) {
      console.error('[tagRulesStore] runRules failed:', err)
      return []
    }
  },

  setLastRunResults: (results) => set({ lastRunResults: results }),
}))
