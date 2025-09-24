const express = require('express');
const { db } = require('./db');
const { authMiddleware } = require('./auth');
const bodyParser = require('body-parser');

const router = express.Router();

router.use(bodyParser.json());
router.use(authMiddleware);

/* Tasks */
router.get('/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY due_at IS NULL, due_at ASC').all();
  res.json(rows);
});

router.post('/tasks', (req, res) => {
  const { title, notes, due_at } = req.body;
  const now = new Date().toISOString();
  const info = db.prepare('INSERT INTO tasks (title, notes, due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(title, notes || null, due_at || null, now, now);
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/tasks/:id', (req, res) => {
  const id = req.params.id;
  const { title, notes, due_at } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE tasks SET title = ?, notes = ?, due_at = ?, updated_at = ? WHERE id = ?').run(title, notes || null, due_at || null, now, id);
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
});

router.delete('/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

/* Reminders */
router.get('/tasks/:id/reminders', (req, res) => {
  const rows = db.prepare('SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at').all(req.params.id);
  res.json(rows);
});

router.post('/tasks/:id/reminders', (req, res) => {
  const task_id = req.params.id;
  const { remind_at, channel, template } = req.body;
  const now = new Date().toISOString();
  const info = db.prepare('INSERT INTO reminders (task_id, remind_at, channel, template, created_at) VALUES (?, ?, ?, ?, ?)').run(task_id, remind_at, channel, template || null, now);
  res.status(201).json(db.prepare('SELECT * FROM reminders WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/reminders/:id', (req, res) => {
  const { remind_at, channel, template, sent } = req.body;
  const id = req.params.id;
  db.prepare('UPDATE reminders SET remind_at = ?, channel = ?, template = ?, sent = ? WHERE id = ?').run(remind_at, channel, template || null, sent ? 1 : 0, id);
  res.json(db.prepare('SELECT * FROM reminders WHERE id = ?').get(id));
});

router.delete('/reminders/:id', (req, res) => {
  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

/* Settings */
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  res.json(out);
});

router.post('/settings', (req, res) => {
  const entries = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const keys = Object.keys(entries);
  const now = new Date().toISOString();
  for (const k of keys) stmt.run(k, entries[k]);
  res.json({ ok: true, updated: keys.length });
});

module.exports = router;
