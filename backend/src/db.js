const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tasks.db');

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(dbPath);
const db = new Database(dbPath);

function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
  db.exec(sql);
  console.log('migrations applied');
}

if (require.main === module) migrate();

module.exports = { db, migrate };
