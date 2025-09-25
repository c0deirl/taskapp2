// backend/src/migrate_remind_at.js
const fs = require('fs');

function ensureRemindAtNullable(db) {
  const cols = db.prepare("PRAGMA table_info(reminders);").all().map(c => c.name);
  if (!cols.length) {
    console.log('reminders table not present, skipping remind_at migration');
    return;
  }
  // If remind_at exists and table already allows NULL, nothing to do.
  const info = db.prepare("PRAGMA table_info(reminders);").all();
  const remindCol = info.find(c => c.name === 'remind_at');
  if (remindCol && remindCol.notnull === 0) {
    console.log('remind_at already nullable; nothing to do');
    return;
  }

  // Recreate table with remind_at nullable and copy data
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN;');

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reminders_repair (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        channel TEXT NOT NULL,
        when_at TEXT,
        remind_at TEXT,
        template TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);

    // Build a column list intersecting existing columns to avoid missing-column errors
    const existingCols = info.map(c => c.name);
    const copyCols = ['id','task_id','channel','when_at','remind_at','template','created_at']
      .filter(c => existingCols.includes(c));

    // If remind_at not present previously, insert NULL for it
    const selectCols = copyCols.map(c => (existingCols.includes(c) ? c : 'NULL AS ' + c)).join(', ');
    const insertCols = ['id','task_id','channel','when_at','remind_at','template','created_at'];

    db.exec(`
      INSERT INTO reminders_repair (${insertCols.join(',')})
      SELECT ${selectCols} FROM reminders;
    `);

    db.exec('DROP TABLE IF EXISTS reminders;');
    db.exec('ALTER TABLE reminders_repair RENAME TO reminders;');
    db.exec('COMMIT;');
    db.exec('PRAGMA foreign_keys = ON;');
    console.log('remind_at migration applied');
  } catch (err) {
    db.exec('ROLLBACK;');
    db.exec('PRAGMA foreign_keys = ON;');
    console.error('remind_at migration failed:', err.message || err);
    throw err;
  }
}

module.exports = { ensureRemindAtNullable };
