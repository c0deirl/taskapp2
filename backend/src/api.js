// backend/src/api.js (append or merge)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, DB_PATH } = require('./db'); // db export already exists

// ensure uploads dir
const DATA_DIR = path.dirname(DB_PATH);
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// serve uploads as static
// in index.js ensure: app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));
// If you prefer to mount here:
router.use('/uploads', express.static(UPLOADS_DIR));

// multer setup (single file field "logo")
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // normalize to logo + extension, avoid collisions
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `logo${ext}`);
  }
});
const upload = multer({ storage });

// helper to upsert a settings key
function upsertSetting(key, value) {
  const upsert = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  upsert.run(key, value);
}

// POST /api/settings/logo
router.post('/settings/logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // set path relative to server root that the frontend can use
    const relPath = `/uploads/${req.file.filename}`;
    upsertSetting('app_logo', relPath);
    res.json({ logo: relPath });
  } catch (err) {
    console.error('logo upload error', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Extend existing POST /api/settings handler to accept app_title
// If you have the handler already, ensure it saves ntfy_server/ntfy_topic and app_title:
router.post('/settings', express.json(), (req, res) => {
  const { ntfy_server, ntfy_topic, app_title } = req.body;
  const upsert = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');

  if (ntfy_server == null) db.prepare('DELETE FROM settings WHERE key = ?').run('ntfy_server'); else upsert.run('ntfy_server', ntfy_server);
  if (ntfy_topic  == null) db.prepare('DELETE FROM settings WHERE key = ?').run('ntfy_topic');  else upsert.run('ntfy_topic', ntfy_topic);
  if (app_title   == null) db.prepare('DELETE FROM settings WHERE key = ?').run('app_title');   else upsert.run('app_title', app_title);

  res.status(204).end();
});

// Ensure GET /api/settings returns app_title and app_logo
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  res.json({
    ntfy_server: out.ntfy_server || null,
    ntfy_topic: out.ntfy_topic || null,
    app_title: out.app_title || 'TaskMgr',
    app_logo: out.app_logo || null
  });
});

module.exports = router;
