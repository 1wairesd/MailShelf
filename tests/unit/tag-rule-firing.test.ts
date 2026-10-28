import { describe, it, expect, beforeEach } from 'vitest'
import { TagRulesRepository } from '../../electron/database/tagRules'
import type { AccountRepository } from '../../electron/database/accounts'
import type { TagRuleRow } from '../../electron/types'

/**
 * These tests exercise the heart of the scheduler: TagRulesRepository.run()
 * and its firing guard. This is the densest, most bug-prone logic in the app
 * and was previously untested.
 *
 * We avoid the native better-sqlite3 binding (compiled for the Electron ABI,
 * unloadable under plain Node) by driving the repository against a small
 * in-memory fake that implements only the `prepare().get/all/run` surface the
 * repository actually uses. The fake dispatches on a stable substring of each
 * SQL statement rather than parsing SQL.
 */

interface FakeAccount {
  id: string
  status: string
  tags: string   // JSON string
  updated_at: string
}

/** Builds an in-memory stand-in for the better-sqlite3 Database instance. */
function makeFakeDb(rules: TagRuleRow[], accounts: FakeAccount[]) {
  const stamps: { id: string; last_run_at: string | null }[] = []

  const db = {
    prepare(sql: string) {
      // ── tag_rules reads ──────────────────────────────────────────────
      if (sql.includes('FROM tag_rules')) {
        return {
          all: () => rules.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)),
          get: (_id: string) => rules.find(r => r.id === _id),
          run: () => ({ changes: 0 }),
        }
      }

      // ── runForced(): clear last_run_at on calendar rules ─────────────
      if (sql.includes('SET last_run_at = NULL')) {
        return {
          run: () => {
            for (const r of rules) {
              if (r.enabled === 1 && (r.trigger === 'day_of_month' || r.trigger === 'day_of_week')) {
                r.last_run_at = null
              }
            }
            return { changes: 0 }
          },
        }
      }

      // ── run(): stamp last_run_at after a genuine evaluation ──────────
      if (sql.includes('UPDATE tag_rules SET last_run_at = ?')) {
        return {
          run: (lastRunAt: string, id: string) => {
            const rule = rules.find(r => r.id === id)
            if (rule) rule.last_run_at = lastRunAt
            stamps.push({ id, last_run_at: lastRunAt })
            return { changes: 1 }
          },
        }
      }

      // ── getCandidates(): tag filter (selects tags column too) ────────
      if (sql.includes('SELECT id, tags, updated_at FROM accounts')) {
        return {
          all: (status: string) =>
            accounts
              .filter(a => a.status === status)
              .map(a => ({ id: a.id, tags: a.tags, updated_at: a.updated_at })),
        }
      }

      // ── getCandidates(): all / group filter (no tags column) ─────────
      if (sql.includes('SELECT id, updated_at FROM accounts')) {
        return {
          all: (status: string) =>
            accounts
              .filter(a => a.status === status)
              .map(a => ({ id: a.id, updated_at: a.updated_at })),
        }
      }

      throw new Error(`Unexpected SQL in fake db: ${sql}`)
    },
  }

  return { db, stamps }
}

/** Fake AccountRepository: records which ids were transitioned and applies it. */
function makeFakeAccounts(store: FakeAccount[]) {
  const transitioned: { ids: string[]; status: string }[] = []
  const repo = {
    bulkUpdateStatus(ids: string[], status: string): number {
      transitioned.push({ ids: [...ids], status })
      for (const a of store) {
        if (ids.includes(a.id)) a.status = status
      }
      return ids.length
    },
  } as unknown as AccountRepository
  return { repo, transitioned }
}

function makeRule(partial: Partial<TagRuleRow>): TagRuleRow {
  return {
    id: 'rule-1',
    filter_type: 'all',
    tag: '',
    group_id: null,
    from_status: 'active',
    to_status: 'exhausted',
    trigger: 'after_days',
    trigger_value: 30,
    enabled: 1,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    last_run_at: null,
    ...partial,
  }
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

describe('TagRulesRepository.run — after_days trigger', () => {
  it('fires for accounts older than the threshold', () => {
    const rule = makeRule({ trigger: 'after_days', trigger_value: 30 })
    const accounts: FakeAccount[] = [
      { id: 'a-old', status: 'active', tags: '[]', updated_at: daysAgo(40) },
      { id: 'a-new', status: 'active', tags: '[]', updated_at: daysAgo(5) },
    ]
    const { db } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    const results = new TagRulesRepository(db as never, repo).run()

    expect(transitioned).toEqual([{ ids: ['a-old'], status: 'exhausted' }])
    expect(results).toEqual([{ ruleId: 'rule-1', affected: 1 }])
    expect(accounts.find(a => a.id === 'a-old')!.status).toBe('exhausted')
    expect(accounts.find(a => a.id === 'a-new')!.status).toBe('active')
  })

  it('reports zero affected when nothing is old enough', () => {
    const rule = makeRule({ trigger: 'after_days', trigger_value: 30 })
    const accounts: FakeAccount[] = [
      { id: 'a-new', status: 'active', tags: '[]', updated_at: daysAgo(2) },
    ]
    const { db } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    const results = new TagRulesRepository(db as never, repo).run()

    expect(transitioned).toEqual([])
    expect(results).toEqual([{ ruleId: 'rule-1', affected: 0 }])
  })

  it('ignores disabled rules entirely', () => {
    const rule = makeRule({ enabled: 0, trigger_value: 1 })
    const accounts: FakeAccount[] = [
      { id: 'a', status: 'active', tags: '[]', updated_at: daysAgo(100) },
    ]
    const { db, stamps } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    const results = new TagRulesRepository(db as never, repo).run()

    expect(results).toEqual([])
    expect(transitioned).toEqual([])
    expect(stamps).toEqual([]) // disabled rule never gets stamped
  })

  it('only affects accounts matching from_status', () => {
    const rule = makeRule({ from_status: 'active', trigger_value: 1 })
    const accounts: FakeAccount[] = [
      { id: 'a-active', status: 'active', tags: '[]', updated_at: daysAgo(50) },
      { id: 'a-dead', status: 'dead', tags: '[]', updated_at: daysAgo(50) },
    ]
    const { db } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    new TagRulesRepository(db as never, repo).run()

    expect(transitioned).toEqual([{ ids: ['a-active'], status: 'exhausted' }])
  })
})

describe('TagRulesRepository.run — tag filter', () => {
  it('fires only for accounts carrying the rule tag', () => {
    const rule = makeRule({ filter_type: 'tag', tag: 'vip', trigger_value: 1 })
    const accounts: FakeAccount[] = [
      { id: 'a-vip', status: 'active', tags: '["vip","work"]', updated_at: daysAgo(10) },
      { id: 'a-plain', status: 'active', tags: '["work"]', updated_at: daysAgo(10) },
    ]
    const { db } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    new TagRulesRepository(db as never, repo).run()

    expect(transitioned).toEqual([{ ids: ['a-vip'], status: 'exhausted' }])
  })

  it('tolerates malformed tags JSON without throwing', () => {
    const rule = makeRule({ filter_type: 'tag', tag: 'vip', trigger_value: 1 })
    const accounts: FakeAccount[] = [
      { id: 'a-bad', status: 'active', tags: 'not-json', updated_at: daysAgo(10) },
      { id: 'a-vip', status: 'active', tags: '["vip"]', updated_at: daysAgo(10) },
    ]
    const { db } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    expect(() => new TagRulesRepository(db as never, repo).run()).not.toThrow()
    expect(transitioned).toEqual([{ ids: ['a-vip'], status: 'exhausted' }])
  })
})

describe('TagRulesRepository.run — calendar firing guard (the critical path)', () => {
  // The guard must: (a) not double-fire within the same period, and
  // (b) not skip accounts added after the last run. It fires an account only
  // when account.updated_at < lastOccurrence AND rule.last_run_at < lastOccurrence.

  it('does not double-fire when already run this period', () => {
    // Rule fires on day 1 of the month; it already ran today.
    const rule = makeRule({
      trigger: 'day_of_month',
      trigger_value: 1,
      last_run_at: new Date().toISOString(), // just ran
    })
    const accounts: FakeAccount[] = [
      { id: 'a', status: 'active', tags: '[]', updated_at: daysAgo(90) },
    ]
    const { db, stamps } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    const results = new TagRulesRepository(db as never, repo).run()

    expect(transitioned).toEqual([])
    expect(results).toEqual([{ ruleId: 'rule-1', affected: 0 }])
    // Guard must NOT stamp last_run_at when it skips the period.
    expect(stamps).toEqual([])
  })

  it('fires once for the period and then stamps last_run_at', () => {
    // day_of_week rule that has never run; an eligible old account exists.
    const rule = makeRule({
      trigger: 'day_of_week',
      trigger_value: new Date().getUTCDay(), // occurrence is today at UTC midnight
      last_run_at: null,
    })
    const accounts: FakeAccount[] = [
      { id: 'a', status: 'active', tags: '[]', updated_at: daysAgo(30) },
    ]
    const { db, stamps } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    const results = new TagRulesRepository(db as never, repo).run()

    expect(transitioned).toEqual([{ ids: ['a'], status: 'exhausted' }])
    expect(results).toEqual([{ ruleId: 'rule-1', affected: 1 }])
    expect(stamps).toHaveLength(1) // stamped after genuine evaluation
  })

  it('skips an account added after the last occurrence (updated_at >= occurrence)', () => {
    // Occurrence is today at UTC midnight; account was touched after midnight,
    // so it was NOT in from_status when the trigger day arrived.
    const rule = makeRule({
      trigger: 'day_of_week',
      trigger_value: new Date().getUTCDay(),
      last_run_at: null,
    })
    const accounts: FakeAccount[] = [
      { id: 'a-fresh', status: 'active', tags: '[]', updated_at: new Date().toISOString() },
    ]
    const { db, stamps } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    const results = new TagRulesRepository(db as never, repo).run()

    // No account qualifies, but the period WAS evaluated -> affected 0, and
    // last_run_at gets stamped so we don't re-scan endlessly.
    expect(transitioned).toEqual([])
    expect(results).toEqual([{ ruleId: 'rule-1', affected: 0 }])
    expect(stamps).toHaveLength(1)
  })
})

describe('TagRulesRepository.runForced', () => {
  it('clears last_run_at on calendar rules so they fire regardless of period', () => {
    const rule = makeRule({
      trigger: 'day_of_month',
      trigger_value: 1,
      last_run_at: new Date().toISOString(), // would normally block this period
    })
    const accounts: FakeAccount[] = [
      { id: 'a', status: 'active', tags: '[]', updated_at: daysAgo(90) },
    ]
    const { db } = makeFakeDb([rule], accounts)
    const { repo, transitioned } = makeFakeAccounts(accounts)

    const results = new TagRulesRepository(db as never, repo).runForced()

    expect(transitioned).toEqual([{ ids: ['a'], status: 'exhausted' }])
    expect(results).toEqual([{ ruleId: 'rule-1', affected: 1 }])
  })
})
