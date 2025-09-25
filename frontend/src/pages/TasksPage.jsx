import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';

// Helper: convert an HTML datetime-local value (YYYY-MM-DDTHH:MM or with seconds)
// into a timezone-aware UTC ISO string (e.g., 2025-09-25T14:49:00.000Z)
function toUtcIsoFromLocalDatetime(localDatetime) {
  if (!localDatetime) return null;
  const parts = localDatetime.split('T');
  if (parts.length !== 2) return null;
  const timePart = parts[1];
  const hasSeconds = timePart.split(':').length === 3;
  const withSeconds = hasSeconds ? localDatetime : `${localDatetime}:00`;
  const d = new Date(withSeconds); // interpreted in browser/local TZ
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function NewTask({ onCreated }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const create = async () => {
    const payload = {
      title,
      notes,
      due_at: toUtcIsoFromLocalDatetime(dueAt) || null
    };
    const t = await api.post('/tasks', payload);
    setTitle(''); setNotes(''); setDueAt('');
    onCreated && onCreated(t);
  };
  return (
    <div className="left task-editor">
      <h3>Create Task</h3>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" />
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)"/>
      <label className="muted">Due date</label>
      <input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)} />
      <button className="btn" onClick={create}>Save Task</button>
    </div>
  );
}

function ReminderRow({ reminder, onDelete }) {
  return (
    <div className="badge">
      <span className="reminder-badge">{reminder.channel}</span>
      <span className="muted" style={{marginLeft:8}}>{new Date(reminder.remind_at).toLocaleString()}</span>
      <button className="btn ghost small" onClick={()=>onDelete(reminder.id)} style={{marginLeft:12}}>Delete</button>
    </div>
  );
}

function TaskCard({ task, onRefresh }) {
  const [showRemForm, setShowRemForm] = useState(false);
  const [remAt, setRemAt] = useState('');
  const [topic, setTopic] = useState('');
  const [serverUrl, setServerUrl] = useState('');

  // reuse helper above to build UTC ISO from datetime-local
  const buildIsoFromLocal = (localDatetime) => toUtcIsoFromLocalDatetime(localDatetime);

  const addReminder = async () => {
    const remind_at_iso = buildIsoFromLocal(remAt);
    if (!remind_at_iso) {
      alert('Please provide a valid date and time');
      return;
    }
    await api.post(`/tasks/${task.id}/reminders`, {
      remind_at: remind_at_iso,
      channel: 'ntfy',
      server_url: serverUrl || undefined,
      topic: topic || undefined
    });
    setShowRemForm(false); setRemAt(''); setTopic(''); setServerUrl('');
    onRefresh && onRefresh();
  };
  const deleteReminder = async (id) => {
    await api.delete(`/tasks/${task.id}/reminders/${id}`);
    onRefresh && onRefresh();
  };
  return (
    <div className="task">
      <div style={{flex:1}}>
        <div className="task-title">{task.title}</div>
        <div className="task-due">{task.due_at ? new Date(task.due_at).toLocaleString() : 'No due date'}</div>
        <div style={{marginTop:8}} className="task-actions">
          {task.reminders?.map(r => <ReminderRow key={r.id} reminder={r} onDelete={deleteReminder} />)}
        </div>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:8, marginLeft:12}}>
        <button className="btn secondary small" onClick={()=>setShowRemForm(v=>!v)}>Reminder</button>
        <button className="btn ghost small" onClick={async ()=>{ await api.delete(`/tasks/${task.id}`); onRefresh && onRefresh(); }}>Delete</button>
      </div>

      {showRemForm && (
        <div style={{marginTop:12, width:'100%'}}>
          <label className="muted">Remind at</label>
          <input type="datetime-local" value={remAt} onChange={e=>setRemAt(e.target.value)} />
          <label className="muted">NTFY topic (optional)</label>
          <input placeholder="topic" value={topic} onChange={e=>setTopic(e.target.value)} />
          <label className="muted">NTFY server (optional override)</label>
          <input placeholder="https://ntfy.example" value={serverUrl} onChange={e=>setServerUrl(e.target.value)} />
          <div style={{display:'flex', gap:8, marginTop:8}}>
            <button className="btn small" onClick={addReminder}>Add</button>
            <button className="btn secondary small" onClick={()=>setShowRemForm(false)}>Cancel</button>
          </div>
          <div style={{marginTop:8}}>
            <small className="muted">Sending (UTC): {buildIsoFromLocal(remAt) || '—'}</small>
            <br />
            <small className="muted">Preview (local): {remAt ? new Date(buildIsoFromLocal(remAt)).toLocaleString() : '—'}</small>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const load = async () => {
    const res = await api.get('/tasks?_embed=reminders');
    setTasks(res || []);
  };
  useEffect(()=>{ load(); }, []);
  return (
    <>
      <NewTask onCreated={load} />
      <div className="right">
        <h3>Tasks</h3>
        <div className="task-list">
          {tasks.map(t => <TaskCard key={t.id} task={t} onRefresh={load} />)}
          {tasks.length === 0 && <div className="muted">No tasks yet.</div>}
        </div>
      </div>
    </>
  );
}
