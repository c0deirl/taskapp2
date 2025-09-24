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

// GET /api/tasks
router.get('/tasks', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('GET /tasks error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/tasks
router.post('/tasks', (req, res) => {
  try {
    const { title, notes, due_at } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const info = db.prepare('INSERT INTO tasks(title, notes, due_at, created_at) VALUES (?, ?, ?, datetime(\'now\'))').run(title, notes || null, due_at || null);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
    res.json(task);
  } catch (err) {
    console.error('POST /tasks error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// DELETE task
router.delete('/tasks/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /tasks/:id error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// --- Reminders routes ---

// GET /api/tasks/:id/reminders
router.get('/tasks/:id/reminders', (req, res) => {
  const taskId = Number(req.params.id);
  if (!taskExists(taskId)) return res.status(404).json({ error: 'task not found' });
  try {
    const reminders = db.prepare('SELECT * FROM reminders WHERE task_id = ? ORDER BY id').all(taskId);
    res.json(reminders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/tasks/:id/reminders
router.post('/tasks/:id/reminders', (req, res) => {
  const taskId = Number(req.params.id);
  if (!taskExists(taskId)) return res.status(404).json({ error: 'task not found' });
  const { channel, when_at, template } = req.body || {};
  if (!channel) return res.status(400).json({ error: 'channel required' });
  // when_at optional; template optional
  try {
    const info = db.prepare(
      'INSERT INTO reminders(task_id, channel, when_at, template, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
    ).run(taskId, channel, when_at || null, template || null);
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(info.lastInsertRowid);
    res.json(reminder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

// DELETE /api/tasks/:taskId/reminders/:reminderId
router.delete('/tasks/:taskId/reminders/:reminderId', (req, res) => {
  const taskId = Number(req.params.taskId);
  const reminderId = Number(req.params.reminderId);
  if (!taskExists(taskId)) return res.status(404).json({ error: 'task not found' });
  try {
    db.prepare('DELETE FROM reminders WHERE id = ? AND task_id = ?').run(reminderId, taskId);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
