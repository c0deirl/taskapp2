// backend/src/db.js (migrated, defensive)
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tasks.db');

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDirFor(DB_PATH);

console.log('SQLite DB path:', DB_PATH);

const db = new Database(DB_PATH);

// Defensive, idempotent migration function
function migrate(db) {
  try {
    // ensure foreign keys
    db.exec("PRAGMA foreign_keys = ON;");

    // If migrations.sql exists, log it but do not blindly exec it (some SQL may refer to columns that don't exist yet).
    const sqlPath = path.join(__dirname, 'migrations.sql');
    if (fs.existsSync(sqlPath)) {
      try {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('--- migrations.sql (start) ---');
        console.log(sql);
        console.log('--- migrations.sql (end) ---');
        // Execute migrations file statements that create tables if they don't exist.
        // We execute it, but wrap in try/catch so single failing statement won't crash startup.
        try {
          db.exec(sql);
          console.log('migrations.sql executed');
        } catch (err) {
          console.warn('migrate: migrations.sql execution had issues, continuing defensively:', err && err.message ? err.message : err);
        }
      } catch (err) {
        console.warn('migrate: failed reading migrations.sql, continuing:', err && err.message ? err.message : err);
      }
    } else {
      console.warn('migrations.sql not found at', sqlPath);
    }

    // Ensure minimal tables exist (idempotent)
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT,
        due_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        remind_at TEXT,
        sent INTEGER DEFAULT 0,
        template TEXT,
        server_url TEXT,
        when_at TEXT,
        topic TEXT,
        channel TEXT NOT NULL DEFAULT 'ntfy',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);
// somewhere after creating `db` in src/db.js
try {
  const cols = db.prepare("PRAGMA table_info(reminders);").all().map(c => c.name);
  if (!cols.includes('topic')) {
    console.log('adding topic column to reminders');
    db.exec("ALTER TABLE reminders ADD COLUMN topic TEXT");
  }
} catch (e) {
  console.warn('ensure topic column failed (continuing):', e && e.message ? e.message : e);
}

    // Inspect current reminders columns and add missing ones
    const cols = db.prepare("PRAGMA table_info(reminders);").all().map(c => c.name);
    const stmts = [];
    if (!cols.includes('sent')) stmts.push("ALTER TABLE reminders ADD COLUMN sent INTEGER DEFAULT 0");
    if (!cols.includes('sent_at')) stmts.push("ALTER TABLE reminders ADD COLUMN sent_at TEXT");
    if (!cols.includes('channel')) stmts.push("ALTER TABLE reminders ADD COLUMN channel TEXT NOT NULL DEFAULT 'ntfy'");
    if (!cols.includes('server_url')) stmts.push("ALTER TABLE reminders ADD COLUMN server_url TEXT");

    if (stmts.length) {
      db.exec('BEGIN');
      try {
        for (const s of stmts) {
          try {
            console.log('migrate: executing:', s);
            db.exec(s);
          } catch (innerErr) {
            console.warn('migrate: statement failed (continuing):', s, innerErr && innerErr.message ? innerErr.message : innerErr);
          }
        }
        db.exec('COMMIT');
        console.log('migrate: applied missing reminders columns if any');
      } catch (err) {
        db.exec('ROLLBACK');
        console.warn('migrate: failed to apply alters, continuing defensively:', err && err.message ? err.message : err);
      }
    } else {
      console.log('migrate: no reminder column alters needed');
    }

    // Ensure helpful indexes exist (idempotent)
    try { db.exec("CREATE INDEX IF NOT EXISTS idx_reminders_remind_at_sent ON reminders(remind_at, sent);"); } catch (_) {}
    try { db.exec("CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);"); } catch (_) {}
    try { db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);"); } catch (_) {}

    // show what tables now exist
    try {
      const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
      console.log('tables after migrations:');
      rows.forEach(r => console.log(r.name));
    } catch (_) {}

    console.log('migrate: completed');
  } catch (err) {
    console.error('migrate: unexpected error', err && err.stack ? err.stack : err);
    throw err;
  }
}

// Run a small migration to ensure remind_at nullable behavior if present
let ensureRemindAtNullable = null;
try {
  ensureRemindAtNullable = require('./migrate_remind_at').ensureRemindAtNullable;
} catch (_) {
  // optional helper not present; skip
}

// Run migrations and other startup normalizations in safe order
try {
  migrate(db);
} catch (err) {
  // If migrate throws unexpectedly, log and continue to attempt other safe normalization steps.
  console.error('migrate failed (continuing startup):', err && err.message ? err.message : err);
}

try {
  if (ensureRemindAtNullable && typeof ensureRemindAtNullable === 'function') {
    try { ensureRemindAtNullable(db); } catch (err) { console.warn('ensureRemindAtNullable failed:', err && err.message ? err.message : err); }
  }
} catch (_) {}

// Add missing sent columns programmatically if helper exists
try {
  const addSentColumns = require('./migrate_add_sent_columns');
  if (typeof addSentColumns === 'function') {
    try { addSentColumns(db); } catch (err) { console.warn('addSentColumns migration failed:', err && err.message ? err.message : err); }
  }
} catch (_) {
  // helper not present; we've already attempted to ALTER above in migrate()
}

// Normalize settings values
try {
  const normalizeSettings = require('./migrate_normalize_settings');
  if (typeof normalizeSettings === 'function') {
    try { normalizeSettings(db); } catch (err) { console.warn('normalizeSettings failed:', err && err.message ? err.message : err); }
  }
} catch (_) {
  // optional; continue
}

// --- ensure-schema (idempotent) ---
try {
  const cols = db.prepare("PRAGMA table_info(reminders);").all().map(c => c.name);
  const ensure = (sql) => {
    try { db.exec(sql); } catch (e) { /* ignore if fails (shouldn't) */ }
  };

  if (!cols.includes('topic')) {
    console.log('migrations: adding reminders.topic column');
    ensure("ALTER TABLE reminders ADD COLUMN topic TEXT");
  }
  if (!cols.includes('server_url')) {
    console.log('migrations: adding reminders.server_url column');
    ensure("ALTER TABLE reminders ADD COLUMN server_url TEXT");
  }
  if (!cols.includes('sent')) {
    console.log('migrations: adding reminders.sent and reminders.sent_at columns');
    ensure("ALTER TABLE reminders ADD COLUMN sent INTEGER DEFAULT 0");
    ensure("ALTER TABLE reminders ADD COLUMN sent_at TEXT");
  }
} catch (err) {
  console.warn('ensure-schema failed, continuing:', err && err.message ? err.message : err);
}
// --- end ensure-schema ---


module.exports = { db, migrate, DB_PATH };
