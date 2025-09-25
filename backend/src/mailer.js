const nodemailer = require('nodemailer');
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
const { render } = require('./templates');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

async function sendEmail(to, subject, template, context) {
  const body = render(template, context);
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'task@localhost',
    to,
    subject,
    text: body,
    html: `<pre>${escapeHtml(body)}</pre>`
  });
}

async function sendNtfy(url, topic, template, context) {
  const body = render(template, context);
  const endpoint = url || process.env.NTFY_BASE || 'https://ntfy.sh';
  const target = `${endpoint}/${topic}`;
  await fetch(target, {
    method: 'POST',
    body,
    headers: { 'Title': context.title || 'Task reminder' }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

module.exports = { sendEmail, sendNtfy };
