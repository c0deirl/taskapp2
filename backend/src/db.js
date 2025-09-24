// backend/src/db.js (debug version)
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

// Run migrations immediately and synchronously, and log state
function migrate() {
  try {
    const sqlPath = path.join(__dirname, 'migrations.sql');
    if (!fs.existsSync(sqlPath)) {
      console.warn('migrations.sql not found at', sqlPath);
      return;
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('--- migrations.sql (start) ---');
    console.log(sql);
    console.log('--- migrations.sql (end) ---');
    db.exec(sql);
    console.log('migrations applied');
    // show what tables now exist
    const rows = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name;").all();
    console.log('tables after migrations:');
    rows.forEach(r => console.log(r.name));
  } catch (err) {
    console.error('migrate failed:', err);
    throw err;
  }
}
const { ensureRemindAtNullable } = require('./migrate_remind_at');
ensureRemindAtNullable(db);

// Ensure migrations run once on module load
migrate();

// after creating `db` (better-sqlite3 instance)
const normalizeSettings = require('./migrate_normalize_settings');
normalizeSettings(db);


module.exports = { db, migrate, DB_PATH };
