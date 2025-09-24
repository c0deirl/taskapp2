const { db } = require('./db');
const { sendEmail, sendNtfy } = require('./mailer');

async function processDueReminders() {
  const now = new Date().toISOString();
  // find reminders that are not sent and remind_at <= now
  const reminders = db.prepare('SELECT r.*, t.title, t.notes, t.due_at FROM reminders r JOIN tasks t ON t.id = r.task_id WHERE r.sent = 0 AND r.remind_at <= ?').all(now);
  for (const r of reminders) {
    const context = { title: r.title, notes: r.notes || '', due: r.due_at || '' };
    try {
      if (r.channel === 'email') {
        const to = process.env.REMINDER_EMAIL_TO;
        const subject = `Reminder: ${r.title}`;
        const template = r.template || process.env.EMAIL_TEMPLATE || 'Task: {{title}}\nDue: {{due}}\n\n{{notes}}';
        await sendEmail(to, subject, template, context);
      } else if (r.channel === 'ntfy') {
        const topic = process.env.NTFY_TOPIC || process.env.NTFY_DEFAULT_TOPIC || 'task-reminders';
        const template = r.template || process.env.NTFY_TEMPLATE || '{{title}} — Due: {{due}}\n\n{{notes}}';
        await sendNtfy(process.env.NTFY_BASE, topic, template, context);
      }
      db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(r.id);
      console.log('sent reminder', r.id, r.channel);
    } catch (err) {
      console.error('failed to send reminder', r.id, err);
    }
  }
}

let timer = null;
function start(intervalMs = 60 * 1000) {
  if (timer) return;
  timer = setInterval(() => processDueReminders().catch(e => console.error(e)), intervalMs);
  console.log('scheduler started (interval ms):', intervalMs);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, processDueReminders };
