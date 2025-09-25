const { db } = require('./db');
const fetch = global.fetch || require('node-fetch');

let timer = null;

function sendNtfy(serverUrl, topic, title, message) {
  const url = `${serverUrl.replace(/\/+$/,'')}/${encodeURIComponent(topic)}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Title': title, 'Priority': 'normal' },
    body: message
  }).then(async r => {
    const text = await r.text().catch(() => '');
    console.log('ntfy response', r.status, text);
    return r.ok;
  });
}

function getRemindersColumns() {
  try {
    const cols = db.prepare("PRAGMA table_info(reminders);").all();
    return cols.map(c => c.name);
  } catch (err) {
    console.error('scheduler: failed to read PRAGMA table_info(reminders):', err && err.message ? err.message : err);
    return [];
  }
}

async function tick() {
  try {
    const nowMs = Date.now();
    const cols = getRemindersColumns();
    const hasSent = cols.includes('sent');
    const hasRemindAt = cols.includes('remind_at');

    let due = [];

    // Build SQL according to available columns
    if (hasRemindAt) {
      if (hasSent) {
        // preferred robust query
        const sql = `
          SELECT reminders.*, tasks.title, tasks.notes
          FROM reminders
          JOIN tasks ON tasks.id = reminders.task_id
          WHERE (sent IS NULL OR sent = 0)
            AND (strftime('%s', remind_at) * 1000) <= ?
        `;
        try {
          due = db.prepare(sql).all(nowMs);
        } catch (err) {
          console.error('scheduler: primary query prepare failed:', err && err.message ? err.message : err);
          console.error('scheduler: PRAGMA table_info(reminders):', db.prepare("PRAGMA table_info(reminders);").all());
        }
      } else {
        // no sent column, select rows due by remind_at and join tasks in JS
        try {
          const rows = db.prepare("SELECT * FROM reminders WHERE (strftime('%s', remind_at) * 1000) <= ?").all(nowMs);
          if (rows && rows.length) {
            const taskStmt = db.prepare("SELECT id, title, notes FROM tasks WHERE id = ?");
            for (const r of rows) {
              const t = taskStmt.get(r.task_id) || {};
              due.push(Object.assign({}, r, { title: t.title, notes: t.notes }));
            }
          }
        } catch (err) {
          console.error('scheduler: remind_at-based fallback failed:', err && err.message ? err.message : err);
          console.error('scheduler: PRAGMA table_info(reminders):', db.prepare("PRAGMA table_info(reminders);").all());
        }
      }
    } else {
      // no remind_at column: select all pending (best-effort) and fetch tasks
      try {
        const rows = db.prepare("SELECT * FROM reminders").all();
        if (rows && rows.length) {
          const taskStmt = db.prepare("SELECT id, title, notes FROM tasks WHERE id = ?");
          for (const r of rows) {
            const t = taskStmt.get(r.task_id) || {};
            due.push(Object.assign({}, r, { title: t.title, notes: t.notes }));
          }
        }
      } catch (err) {
        console.error('scheduler: final fallback select failed:', err && err.message ? err.message : err);
        return;
      }
    }

    if (!due || due.length === 0) return;

    // load settings once
    const srows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    srows.forEach(s => {
      try { settings[s.key] = JSON.parse(s.value); } catch { settings[s.key] = s.value; }
    });

    for (const r of due) {
      try {
        console.log('scheduler: processing reminder', r.id, r.remind_at, 'nowMs=', nowMs);
        if (r.channel === 'ntfy' || (!r.channel && (r.server_url || settings.ntfy_server))) {
          const server = r.server_url || settings.ntfy_server || 'https://ntfy.sh';
          const topic = r.topic || settings.ntfy_topic;
          if (!topic) {
            console.warn('skip ntfy reminder missing topic for reminder', r.id);
            continue;
          }
          const title = `Reminder: ${r.title || 'task'}`;
          const body = r.template || (r.notes ? `${r.notes}\n\nTask: ${r.title}` : `Task: ${r.title}`);
          const ok = await sendNtfy(server, topic, title, body);
          if (!ok) {
            console.warn('ntfy publish returned non-ok for reminder', r.id);
            continue;
          }
        } else {
          console.warn('unknown or unsupported channel for reminder', r.id, r.channel);
          continue;
        }

        // update DB: set sent if column exists, always try to set sent_at if column exists
        if (hasSent && cols.includes('sent_at')) {
          db.prepare("UPDATE reminders SET sent = 1, sent_at = datetime('now') WHERE id = ?").run(r.id);
          console.log('scheduler: marked sent', r.id);
        } else if (cols.includes('sent_at')) {
          db.prepare("UPDATE reminders SET sent_at = datetime('now') WHERE id = ?").run(r.id);
          console.log('scheduler: updated sent_at (no sent column) for', r.id);
        } else {
          console.log('scheduler: no sent/sent_at column to update for', r.id);
        }
      } catch (err) {
        console.error('failed to send reminder', r.id, err && err.stack ? err.stack : err);
      }
    }
  } catch (err) {
    console.error('scheduler tick failed', err && err.stack ? err.stack : err);
  }
}

module.exports = {
  start(intervalMs = 60000) {
    if (timer) clearInterval(timer);
    timer = setInterval(() => { tick(); }, intervalMs);
    // run once after a short delay so startup migrations can finish
    setTimeout(() => tick(), 2000);
    console.log('scheduler started (interval ms):', intervalMs);
  },
  stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }
};
