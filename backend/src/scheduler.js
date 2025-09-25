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

async function tick() {
  try {
    const nowMs = Date.now();

    // Primary, robust SQL (no table-qualified column names in WHERE)
    const primarySql = `
      SELECT reminders.*, tasks.title, tasks.notes
      FROM reminders
      JOIN tasks ON tasks.id = reminders.task_id
      WHERE (sent IS NULL OR sent = 0)
        AND (strftime('%s', remind_at) * 1000) <= ?
    `;

    let due;
    try {
      due = db.prepare(primarySql).all(nowMs);
    } catch (err) {
      // Log schema and the error, then try fallback queries
      console.error('scheduler: prepare failed for primary SQL', err && err.message ? err.message : err);
      try {
        console.error('scheduler: PRAGMA table_info(reminders):', db.prepare("PRAGMA table_info(reminders);").all());
      } catch (pErr) {
        console.error('scheduler: failed to read PRAGMA', pErr && pErr.message ? pErr.message : pErr);
      }

      // Fallback 1: select without join (we'll join in JS)
      try {
        const rows = db.prepare(
          "SELECT * FROM reminders WHERE (sent IS NULL OR sent = 0) AND (strftime('%s', remind_at) * 1000) <= ?"
        ).all(nowMs);
        if (rows && rows.length) {
          // fetch tasks for those reminders
          due = [];
          const taskStmt = db.prepare("SELECT id,title,notes FROM tasks WHERE id = ?");
          for (const r of rows) {
            const t = taskStmt.get(r.task_id) || {};
            due.push(Object.assign({}, r, { title: t.title, notes: t.notes }));
          }
        } else {
          due = [];
        }
      } catch (fb1Err) {
        console.error('scheduler: fallback1 failed', fb1Err && fb1Err.message ? fb1Err.message : fb1Err);
        // Fallback 2: try simplest prepare (no strftime) to test
        try {
          due = db.prepare("SELECT * FROM reminders WHERE (sent IS NULL OR sent = 0)").all();
        } catch (fb2Err) {
          console.error('scheduler: fallback2 failed', fb2Err && fb2Err.message ? fb2Err.message : fb2Err);
          return;
        }
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
        if (r.channel === 'ntfy') {
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
          console.warn('unknown channel for reminder', r.id, r.channel);
          continue;
        }

        // mark sent only after successful publish
        db.prepare("UPDATE reminders SET sent = 1, sent_at = datetime('now') WHERE id = ?").run(r.id);
        console.log('scheduler: marked sent', r.id);
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
    // run once after short delay so startup migrations finish
    setTimeout(() => tick(), 2000);
    console.log('scheduler started (interval ms):', intervalMs);
  },
  stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }
};
