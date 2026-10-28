import type Database from 'better-sqlite3'

/**
 * Database schema & migrations.
 *
 * Versioning uses SQLite's built-in `PRAGMA user_version` — no extra table
 * needed. Each migration is a numbered step applied in order; the pragma is
 * bumped after each one so a step never runs twice. On a brand-new database
 * all steps run in sequence, producing the full current schema.
 *
 * To add a migration: append a new entry to MIGRATIONS with the next version
 * number. Never edit or renumber an existing entry — users' databases have
 * already recorded which versions they're past.
 */

/** The schema version this build expects. Equals MIGRATIONS.length. */
export const LATEST_SCHEMA_VERSION = 2

type Migration = (db: Database.Database) => void

/**
 * v1 — initial schema: accounts (+ FTS5 mirror & sync triggers), tag_rules,
 * groups, and the account_groups join table.
 *
 * tag_rules is defined here in full, including filter_type and group_id. The
 * v2 migration below adds those same columns to pre-existing databases that
 * were created before they existed.
 */
const v1_initialSchema: Migration = (db) => {
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
      filter_type   TEXT NOT NULL DEFAULT 'tag'
                    CHECK(filter_type IN ('tag','group','all')),
      tag           TEXT NOT NULL DEFAULT '',
      group_id      TEXT,
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
}

/**
 * v2 — additive column migrations for databases created before v1's schema
 * included them. On a fresh database these columns already exist from v1, so
 * every check is a no-op. Kept idempotent for safety.
 */
const v2_addColumns: Migration = (db) => {
  if (!hasColumn(db, 'accounts', 'archived_at')) {
    db.exec('ALTER TABLE accounts ADD COLUMN archived_at TEXT')
  }
  if (!hasColumn(db, 'tag_rules', 'filter_type')) {
    db.exec("ALTER TABLE tag_rules ADD COLUMN filter_type TEXT NOT NULL DEFAULT 'tag'")
  }
  if (!hasColumn(db, 'tag_rules', 'group_id')) {
    db.exec('ALTER TABLE tag_rules ADD COLUMN group_id TEXT')
  }
}

/** Ordered list — index + 1 is the version each migration brings the DB to. */
const MIGRATIONS: Migration[] = [
  v1_initialSchema,
  v2_addColumns,
]

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return cols.some(c => c.name === column)
}

/**
 * Apply any migrations the database hasn't seen yet, in order, then record the
 * new version. Runs inside a transaction so a failed migration leaves the
 * version untouched and the DB in its prior state.
 */
export function migrate(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number

  if (current >= MIGRATIONS.length) return

  db.transaction(() => {
    for (let version = current; version < MIGRATIONS.length; version++) {
      MIGRATIONS[version](db)
    }
  })()

  // PRAGMA user_version can't be parameterised — value is a trusted integer.
  db.pragma(`user_version = ${MIGRATIONS.length}`)
}
