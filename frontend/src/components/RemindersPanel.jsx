import React, { useEffect, useState } from 'react';
import { fetchReminders, createReminder, updateReminder, deleteReminder } from '../api';
import ReminderRow from './ReminderRow';

export default function RemindersPanel({ auth, task, onClose, onReload }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    remind_at: '',
    channel: 'email',
    template: ''
  });

  useEffect(() => {
    reload();
  }, [task]);

  async function reload() {
    setLoading(true);
    try {
      const rows = await fetchReminders(auth, task.id);
      setReminders(rows);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset) {
    setForm(f => ({ ...f, template: preset }));
  }

  async function submitNew(e) {
    e.preventDefault();
    if (!form.remind_at) return alert('Reminder date/time required');
    setCreating(true);
    try {
      await createReminder(auth, task.id, {
        remind_at: form.remind_at,
        channel: form.channel,
        template: form.template
      });
      setForm({ remind_at: '', channel: 'email', template: '' });
      await reload();
      onReload && onReload();
    } catch (err) {
      console.error(err);
      alert('Failed to create reminder');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal" role="dialog">
      <div className="modal-body" style={{ minWidth: 420, maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Reminders for: {task.title}</h3>
          <div>
            <button onClick={onClose} className="btn">Close</button>
          </div>
        </div>

        <form onSubmit={submitNew} style={{ marginTop: 12 }}>
          <label>When</label>
          <input type="datetime-local" value={form.remind_at} onChange={e => setForm({ ...form, remind_at: e.target.value })} />

          <label>Channel</label>
          <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
            <option value="email">Email</option>
            <option value="ntfy">ntfy</option>
          </select>

          <label>Template</label>
          <textarea rows={4} value={form.template} onChange={e => setForm({ ...form, template: e.target.value })} placeholder="Use {{title}}, {{notes}}, {{due}}"/>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="btn">{creating ? 'Creating...' : 'Create reminder'}</button>
            <button type="button" className="btn" onClick={() => applyPreset('Reminder: {{title}} — Due: {{due}}')}>Apply quick</button>
            <button type="button" className="btn" onClick={() => applyPreset('{{title}}\n\n{{notes}}')}>Notes only</button>
          </div>
        </form>

        <hr style={{ margin: '12px 0' }} />

        <h4>Existing reminders</h4>
        {loading ? <div>Loading...</div> : (
          <div>
            {reminders.length === 0 && <div>No reminders</div>}
            {reminders.map(r => (
              <ReminderRow key={r.id} reminder={r} auth={auth} onUpdated={reload} onDeleted={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
