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
    const due = db.prepare(
      "SELECT reminders.*, tasks.title, tasks.notes FROM reminders JOIN tasks ON tasks.id = reminders.task_id WHERE (reminders.sent IS NULL OR reminders.sent = 0) AND (strftime('%s', reminders.remind_at) * 1000) <= ?"
    ).all(nowMs);

    if (!due.length) return;

    // load settings once
    const srows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    srows.forEach(s => {
      try {
        settings[s.key] = JSON.parse(s.value);
      } catch (_) {
        settings[s.key] = s.value;
      }
    });

    for (const r of due) {
      try {
        console.log('scheduler: processing reminder', r.id, r.remind_at, 'nowMs=', nowMs);
        if (r.channel === 'ntfy') {
          const server = r.server_url || settings.ntfy_server || 'https://ntfy.sh';
          const topic = r.topic || settings.ntfy_topic;
          if (!topic) {
            console.warn('skip ntfy reminder missing topic for reminder', r.id);
          } else {
            const title = `Reminder: ${r.title}`;
            const body = r.template || (r.notes ? `${r.notes}\n\nTask: ${r.title}` : `Task: ${r.title}`);
            const ok = await sendNtfy(server, topic, title, body);
            if (!ok) {
              console.warn('ntfy publish returned non-ok for reminder', r.id);
              continue;
            }
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
    setTimeout(() => tick(), 1000);
    console.log('scheduler started (interval ms):', intervalMs);
  },
  stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }
};
