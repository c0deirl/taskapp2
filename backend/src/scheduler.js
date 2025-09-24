const { db } = require('./db');
const fetch = global.fetch || require('node-fetch');

let timer = null;

function sendNtfy(serverUrl, topic, title, message) {
  const url = `${serverUrl.replace(/\/+$/,'')}/${encodeURIComponent(topic)}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Title': title, 'Priority': 'normal' },
    body: message
  }).then(r => r.ok);
}

async function tick() {
  try {
    const now = new Date().toISOString();
    const due = db.prepare('SELECT r.*, t.title, t.notes FROM reminders r JOIN tasks t ON t.id = r.task_id WHERE r.sent = 0 AND r.remind_at <= ?').all(now);
    if (!due.length) return;
    // default settings
    const srows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    srows.forEach(s => settings[s.key] = s.value);
    for (const r of due) {
      try {
        if (r.channel === 'ntfy') {
          const server = r.server_url || settings.ntfy_server || 'https://ntfy.sh';
          const topic = r.topic || settings.ntfy_topic;
          if (!topic) {
            console.warn('skip ntfy reminder missing topic for reminder', r.id);
          } else {
            const title = `Reminder: ${r.title}`;
            const body = r.template || (r.notes ? `${r.notes}\n\nTask: ${r.title}` : `Task: ${r.title}`);
            await sendNtfy(server, topic, title, body);
          }
        }
        // mark sent
        db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(r.id);
      } catch (err) {
        console.error('failed to send reminder', r.id, err);
      }
    }
  } catch (err) {
    console.error('scheduler tick failed', err);
  }
}

module.exports = {
  start(intervalMs = 60000) {
    if (timer) clearInterval(timer);
    timer = setInterval(() => { tick(); }, intervalMs);
    // run once immediately
    setTimeout(() => tick(), 1000);
    console.log('scheduler started (interval ms):', intervalMs);
  },
  stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }
};
