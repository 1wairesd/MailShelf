import Database from 'better-sqlite3'
import path from 'path'
import { migrate } from './migrations'
import { AccountRepository } from './accounts'
import { TagRulesRepository } from './tagRules'
import { GroupsRepository } from './groups'
import {
  AccountFilters,
  CreateAccountInput,
  UpdateAccountInput,
  CreateTagRuleInput,
  UpdateTagRuleInput,
  CreateGroupInput,
  UpdateGroupInput,
} from '../types'

/**
 * DatabaseService is the single public interface for all DB operations.
 * Internally it delegates to domain repositories; the external API
 * (method names and signatures) is unchanged so all IPC handlers continue
 * to work without modification.
 */
export class DatabaseService {
  private readonly accounts:  AccountRepository
  private readonly tagRules:  TagRulesRepository
  private readonly groups:    GroupsRepository

  constructor(userDataPath: string) {
    const db = new Database(path.join(userDataPath, 'mailshelf.db'))
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('synchronous  = NORMAL')

    migrate(db)

    this.accounts  = new AccountRepository(db)
    this.groups    = new GroupsRepository(db)
    this.tagRules  = new TagRulesRepository(db, this.accounts)

    // Keep a reference only for close()
    this._db = db
  }

  private readonly _db: Database.Database

  close(): void {
    this._db.close()
  }

  // ─── Accounts ───────────────────────────────────────────────────────────────

  getAccounts       = (filters?: AccountFilters)                         => this.accounts.getAll(filters)
  getAccountById    = (id: string)                                        => this.accounts.getById(id)
  createAccount     = (input: CreateAccountInput)                         => this.accounts.create(input)
  updateAccount     = (id: string, input: UpdateAccountInput)             => this.accounts.update(id, input)
  deleteAccount     = (id: string)                                        => this.accounts.delete(id)
  bulkDeleteAccounts= (ids: string[])                                     => this.accounts.bulkDelete(ids)
  bulkUpdateStatus  = (ids: string[], status: string)                     => this.accounts.bulkUpdateStatus(ids, status)
  bulkUpdateTag     = (ids: string[], tag: string, mode: 'add'|'remove')  => this.accounts.bulkUpdateTag(ids, tag, mode)
  getStats          = ()                                                   => this.accounts.getStats()
  getAllTags         = ()                                                   => this.accounts.getAllTags()
  getTagCounts      = ()                                                   => this.accounts.getTagCounts()
  getTagsAndCounts  = ()                                                   => this.accounts.getTagsAndCounts()
  exportAccounts    = ()                                                   => this.accounts.exportAll()
  exportAccountsCSV = ()                                                   => this.accounts.exportCSV()
  importAccounts    = (accounts: CreateAccountInput[])                    => this.accounts.import(accounts)

  // ─── Tag Rules ──────────────────────────────────────────────────────────────

  getTagRules     = ()                                          => this.tagRules.getAll()
  getTagRuleById  = (id: string)                                => this.tagRules.getById(id)
  createTagRule   = (input: CreateTagRuleInput)                 => this.tagRules.create(input)
  updateTagRule   = (id: string, input: UpdateTagRuleInput)     => this.tagRules.update(id, input)
  deleteTagRule   = (id: string)                                => this.tagRules.delete(id)
  runTagRules     = ()                                          => this.tagRules.run()

  // ─── Groups ─────────────────────────────────────────────────────────────────

  getGroups             = ()                                                    => this.groups.getAll()
  getGroupById          = (id: string)                                           => this.groups.getById(id)
  createGroup           = (input: CreateGroupInput)                              => this.groups.create(input)
  updateGroup           = (id: string, input: UpdateGroupInput)                  => this.groups.update(id, input)
  deleteGroup           = (id: string)                                           => this.groups.delete(id)
  getGroupCounts        = ()                                                     => this.groups.getCounts()
  getAccountGroups      = (accountId: string)                                    => this.groups.getAccountGroups(accountId)
  addAccountsToGroup    = (groupId: string, accountIds: string[])                => this.groups.addAccounts(groupId, accountIds)
  removeAccountsFromGroup=(groupId: string, accountIds: string[])                => this.groups.removeAccounts(groupId, accountIds)
  moveAccountsToGroup   = (groupId: string | null, accountIds: string[])        => this.groups.moveAccounts(groupId, accountIds)
}
