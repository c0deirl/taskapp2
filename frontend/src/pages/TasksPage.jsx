import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';

function NewTask({ onCreated }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const create = async () => {
    const t = await api.post('/tasks', { title, notes, due_at: dueAt || null });
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
  useEffect(()=> {
    // no-op
  }, []);
  const addReminder = async () => {
    await api.post(`/tasks/${task.id}/reminders`, {
      remind_at: remAt,
      channel: 'ntfy',
      server_url: serverUrl || undefined,
      topic: topic || undefined
    });
    setShowRemForm(false); setRemAt(''); onRefresh && onRefresh();
  };
  const deleteReminder = async (id) => {
    await api.delete(`/reminders/${id}`);
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
