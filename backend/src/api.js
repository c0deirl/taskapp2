// backend/src/api.js
const express = require('express');
const router = express.Router();
const { db } = require('./db');

// utility for settings as key-value
function getSettingsObj() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  return out;
}

router.get('/settings', (req, res) => {
  const s = getSettingsObj();
  res.json({
    ntfy_server: s.ntfy_server || null,
    ntfy_topic: s.ntfy_topic || null
  });
});

router.post('/settings', express.json(), (req, res) => {
  const { ntfy_server, ntfy_topic } = req.body;
  const upsert = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  if (ntfy_server === null || ntfy_server === undefined) {
    db.prepare('DELETE FROM settings WHERE key = ?').run('ntfy_server');
  } else {
    upsert.run('ntfy_server', ntfy_server);
  }
  if (ntfy_topic === null || ntfy_topic === undefined) {
    db.prepare('DELETE FROM settings WHERE key = ?').run('ntfy_topic');
  } else {
    upsert.run('ntfy_topic', ntfy_topic);
  }
  res.status(204).end();
});

// CRUD tasks
router.get('/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json(rows);
});

router.post('/tasks', express.json(), (req, res) => {
  const { title, notes, due_at } = req.body;
  const info = db.prepare('INSERT INTO tasks(title, notes, due_at) VALUES (?, ?, ?)').run(title, notes, due_at);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.json(task);
});

router.delete('/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// reminders
router.post('/tasks/:id/reminders', express.json(), (req, res) => {
  const taskId = Number(req.params.id);
  const { remind_at, channel, template, server_url, topic } = req.body;
  const info = db.prepare('INSERT INTO reminders(task_id, remind_at, channel, template, server_url, topic) VALUES (?, ?, ?, ?, ?, ?)').run(taskId, remind_at, channel || 'ntfy', template || null, server_url || null, topic || null);
  const r = db.prepare('SELECT * FROM reminders WHERE id = ?').get(info.lastInsertRowid);
  res.json(r);
});

router.delete('/reminders/:id', (req, res) => {
  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// optional helper: embed reminders with tasks when requested
router.get('/tasks-embed', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  const rems = db.prepare('SELECT * FROM reminders').all();
  const out = tasks.map(t => ({ ...t, reminders: rems.filter(r => r.task_id === t.id) }));
  res.json(out);
});

module.exports = router;
