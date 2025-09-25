import React, { useState } from 'react';
import { updateReminder, deleteReminder } from '../api';

export default function ReminderRow({ reminder, auth, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    remind_at: reminder.remind_at ? reminder.remind_at.replace('Z', '') : '',
    channel: reminder.channel,
    template: reminder.template || ''
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateReminder(auth, reminder.id, {
        remind_at: form.remind_at,
        channel: form.channel,
        template: form.template,
        sent: reminder.sent ? 1 : 0
      });
      setEditing(false);
      onUpdated && onUpdated();
    } catch (err) {
      console.error(err);
      alert('Failed to update reminder');
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!confirm('Delete reminder?')) return;
    try {
      await deleteReminder(auth, reminder.id);
      onDeleted && onDeleted();
    } catch (err) {
      console.error(err);
      alert('Failed to delete reminder');
    }
  }

  function copyTemplate() {
    navigator.clipboard && navigator.clipboard.writeText(form.template || reminder.template || '')
      .then(() => alert('Template copied to clipboard'))
      .catch(() => alert('Copy failed'));
  }

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.06)', padding: 8, borderRadius: 6, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{new Date(reminder.remind_at).toLocaleString()}</strong>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{reminder.channel} — {reminder.sent ? 'sent' : 'pending'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditing(e => !e)} className="btn">{editing ? 'Cancel' : 'Edit'}</button>
          <button onClick={del} className="btn">Delete</button>
        </div>
      </div>

      {editing ? (
        <div style={{ marginTop: 8 }}>
          <input type="datetime-local" value={form.remind_at} onChange={e => setForm({ ...form, remind_at: e.target.value })} />
          <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
            <option value="email">Email</option>
            <option value="ntfy">ntfy</option>
          </select>
          <textarea rows={3} value={form.template} onChange={e => setForm({ ...form, template: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} className="btn">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={copyTemplate} className="btn">Copy template</button>
          </div>
        </div>
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{reminder.template || '(no template — will use global/default)'}</pre>
      )}
    </div>
  );
}
