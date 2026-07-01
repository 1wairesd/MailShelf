import type Database from 'better-sqlite3'

export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL,
      password    TEXT NOT NULL DEFAULT '',
      provider    TEXT NOT NULL DEFAULT 'gmail',
      notes       TEXT NOT NULL DEFAULT '',
      tags        TEXT NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'active'
                  CHECK(status IN ('active','exhausted','waiting-reset','dead','archived')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT,
      archived_at  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_status     ON accounts(status);
    CREATE INDEX IF NOT EXISTS idx_accounts_email      ON accounts(email);
    CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at);
    CREATE INDEX IF NOT EXISTS idx_accounts_updated_at ON accounts(updated_at);

    CREATE VIRTUAL TABLE IF NOT EXISTS accounts_fts USING fts5(
      id UNINDEXED,
      email,
      notes,
      tags,
      content='accounts',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS accounts_ai AFTER INSERT ON accounts BEGIN
      INSERT INTO accounts_fts(rowid, id, email, notes, tags)
      VALUES (new.rowid, new.id, new.email, new.notes, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS accounts_ad AFTER DELETE ON accounts BEGIN
      INSERT INTO accounts_fts(accounts_fts, rowid, id, email, notes, tags)
      VALUES ('delete', old.rowid, old.id, old.email, old.notes, old.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS accounts_au AFTER UPDATE ON accounts BEGIN
      INSERT INTO accounts_fts(accounts_fts, rowid, id, email, notes, tags)
      VALUES ('delete', old.rowid, old.id, old.email, old.notes, old.tags);
      INSERT INTO accounts_fts(rowid, id, email, notes, tags)
      VALUES (new.rowid, new.id, new.email, new.notes, new.tags);
    END;

    CREATE TABLE IF NOT EXISTS tag_rules (
      id            TEXT PRIMARY KEY,
      tag           TEXT NOT NULL,
      from_status   TEXT NOT NULL,
      to_status     TEXT NOT NULL,
      trigger       TEXT NOT NULL CHECK(trigger IN ('after_days','day_of_month','day_of_week')),
      trigger_value INTEGER NOT NULL,
      enabled       INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      last_run_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS groups (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#6366f1',
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS account_groups (
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      group_id   TEXT NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
      PRIMARY KEY (account_id, group_id)
    );

    CREATE INDEX IF NOT EXISTS idx_account_groups_group ON account_groups(group_id);
  `)

  // Column migrations for existing databases
  const cols = (db.prepare('PRAGMA table_info(accounts)').all() as { name: string }[]).map(c => c.name)
  if (!cols.includes('archived_at')) {
    db.exec('ALTER TABLE accounts ADD COLUMN archived_at TEXT')
  }
}
