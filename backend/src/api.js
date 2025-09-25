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

// POST /api/settings/logo (file upload)
router.post('/settings/logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const publicPath = `/uploads/${path.basename(req.file.path)}`;
    const insert = db.prepare(
      "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );
    insert.run('app_logo', JSON.stringify(publicPath));
    res.json({ logo: publicPath });
  } catch (err) {
    console.error('POST /settings/logo error', err);
    res.status(500).json({ error: 'internal' });
  }
});


// PUT /api/settings (replace multiple settings)
router.put('/settings', (req, res) => {
  try {
    const settings = req.body || {};
    const insert = db.prepare(
      "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );
    const tx = db.transaction((pairs) => {
      for (const [k, v] of pairs) {
        insert.run(k, JSON.stringify(v));
      }
    });
    tx(Object.entries(settings));
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /settings error', err);
    res.status(500).json({ error: 'internal' });
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

// GET /api/settings
router.get('/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const obj = {};
    for (const r of rows) {
      const raw = r.value;
      try {
        obj[r.key] = JSON.parse(raw);
      } catch (e) {
        console.warn(`settings: value for key=${r.key} is not JSON, returning raw string`);
        obj[r.key] = raw;
      }
    }
    res.json(obj);
  } catch (err) {
    console.error('GET /settings error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// helper: check task exists
function taskExists(taskId) {
  return !!db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId);
}

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

    const info = db.prepare(
      "INSERT INTO tasks(title, notes, due_at, created_at) VALUES (?, ?, ?, datetime('now'))"
    ).run(title, notes || null, due_at || null);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
    res.json(task);
  } catch (err) {
    console.error('POST /tasks error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// GET /api/tasks/:id
router.get('/tasks/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  } catch (err) {
    console.error('GET /tasks/:id error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, notes, due_at } = req.body || {};
    if (!taskExists(id)) return res.status(404).json({ error: 'task not found' });
    db.prepare('UPDATE tasks SET title = ?, notes = ?, due_at = ? WHERE id = ?')
      .run(title || null, notes || null, due_at || null, id);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(task);
  } catch (err) {
    console.error('PUT /tasks/:id error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!taskExists(id)) return res.status(404).json({ error: 'task not found' });
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /tasks/:id error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// -------------------- Reminders --------------------

// GET /api/tasks/:id/reminders
router.get('/tasks/:id/reminders', (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskExists(taskId)) return res.status(404).json({ error: 'task not found' });
    const reminders = db.prepare('SELECT * FROM reminders WHERE task_id = ? ORDER BY id').all(taskId);
    res.json(reminders);
  } catch (err) {
    console.error('GET /tasks/:id/reminders error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/tasks/:id/reminders
router.post('/tasks/:id/reminders', (req, res) => {
  try {
    console.log('POST /tasks/:id/reminders req.body:', req.body);
    const taskId = Number(req.params.id);
    if (!taskExists(taskId)) return res.status(404).json({ error: 'task not found' });

    const body = req.body || {};
    
    console.log('POST /tasks/:id/reminders req.body:', req.body);

    // Normalize remind_at to a canonical UTC ISO string (accepts epoch, ISO with TZ, or naive local)
    let remind_at_raw = body.remind_at || body.when_at || null;
    if (!remind_at_raw && body.date && body.time) remind_at_raw = `${body.date}T${body.time}`;

    // single variable used for normalized UTC ISO string
    let remind_at = null;
    if (remind_at_raw != null) {
      // numeric epoch (seconds or milliseconds)
      if (typeof remind_at_raw === 'number' || /^[0-9]+$/.test(String(remind_at_raw))) {
        const n = Number(remind_at_raw);
        const ts = n < 1e12 ? n * 1000 : n; // treat <1e12 as seconds
        const d = new Date(ts);
        if (!isNaN(d.getTime())) remind_at = d.toISOString();
      } else if (typeof remind_at_raw === 'string') {
        const s = remind_at_raw.trim();
        // If string includes timezone (Z or ±HH:MM) let Date parse it and convert to ISO
        if (/[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s)) {
          const d = new Date(s);
          if (!isNaN(d.getTime())) remind_at = d.toISOString();
        } else {
          // Naive datetime without timezone (e.g., "2025-09-24T17:39" or "2025-09-24 17:39")
          const m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})[T\s]?(\d{2}):?(\d{2})(?::?(\d{2}))?$/);
          if (m) {
            const year = Number(m[1]);
            const month = Number(m[2]) - 1;
            const day = Number(m[3]);
            const hour = Number(m[4]);
            const minute = Number(m[5]);
            const second = m[6] ? Number(m[6]) : 0;
            // Construct using local time and convert to UTC ISO
            const d = new Date(year, month, day, hour, minute, second);
            if (!isNaN(d.getTime())) remind_at = d.toISOString();
          } else {
            // Last resort: try Date parser
            const d = new Date(s);
            if (!isNaN(d.getTime())) remind_at = d.toISOString();
          }
        }
      }
    }

    if (!remind_at) return res.status(400).json({ error: 'remind_at required or could not be parsed' });

    console.log('remind_at raw:', remind_at_raw, 'normalized UTC ISO:', remind_at);

    const channel = body.channel;
    const template = body.template || null;
    const topic = body.topic || body.ntfy_topic || null;
    const server_url = body.server_url || body.ntfy_server || null;

    if (!channel) return res.status(400).json({ error: 'channel required' });

    // Inspect schema to choose appropriate insert
    const colsInfo = db.prepare("PRAGMA table_info(reminders);").all().map(c => c.name);
    const hasRemindAt = colsInfo.includes('remind_at');
    const hasWhenAt = colsInfo.includes('when_at');
    const hasTopic = colsInfo.includes('topic');
    const hasServerUrl = colsInfo.includes('server_url');

    let info;
    if (hasRemindAt) {
      const insertCols = ['task_id','channel','remind_at'];
      const insertVals = [taskId, channel, remind_at];
      if (hasTopic) { insertCols.push('topic'); insertVals.push(topic); }
      if (hasServerUrl) { insertCols.push('server_url'); insertVals.push(server_url); }
      insertCols.push('template'); insertVals.push(template);

      const placeholders = insertCols.map(_ => '?').join(', ');
      const colsSql = insertCols.join(',');
      const sql = `INSERT INTO reminders(${colsSql}, created_at) VALUES (${placeholders}, datetime('now'))`;
      info = db.prepare(sql).run(...insertVals);
    } else if (hasWhenAt) {
      const insertCols = ['task_id','channel','when_at'];
      const insertVals = [taskId, channel, remind_at];
      if (hasTopic) { insertCols.push('topic'); insertVals.push(topic); }
      if (hasServerUrl) { insertCols.push('server_url'); insertVals.push(server_url); }
      insertCols.push('template'); insertVals.push(template);

      const placeholders = insertCols.map(_ => '?').join(', ');
      const colsSql = insertCols.join(',');
      const sql = `INSERT INTO reminders(${colsSql}, created_at) VALUES (${placeholders}, datetime('now'))`;
      info = db.prepare(sql).run(...insertVals);
    } else {
      // fallback: try inserting without a timestamp column
      const insertCols = ['task_id','channel'];
      const insertVals = [taskId, channel];
      if (hasTopic) { insertCols.push('topic'); insertVals.push(topic); }
      if (hasServerUrl) { insertCols.push('server_url'); insertVals.push(server_url); }
      insertCols.push('template'); insertVals.push(template);

      const placeholders = insertCols.map(_ => '?').join(', ');
      const colsSql = insertCols.join(',');
      const sql = `INSERT INTO reminders(${colsSql}, created_at) VALUES (${placeholders}, datetime('now'))`;
      info = db.prepare(sql).run(...insertVals);
    }

    console.log('Inserted reminder id:', info.lastInsertRowid);
    const inserted = db.prepare('SELECT * FROM reminders WHERE id = ?').get(info.lastInsertRowid);
    console.log('Inserted row:', inserted);

    res.json(inserted);
  } catch (err) {
    console.error('POST /tasks/:id/reminders error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'internal' });
  }
});



// DELETE /api/tasks/:taskId/reminders/:reminderId
router.delete('/tasks/:taskId/reminders/:reminderId', (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const reminderId = Number(req.params.reminderId);
    if (!taskExists(taskId)) return res.status(404).json({ error: 'task not found' });
    db.prepare('DELETE FROM reminders WHERE id = ? AND task_id = ?').run(reminderId, taskId);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /reminders error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// -------------------- Health --------------------
router.get('/healthz', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
module.exports = router;
