// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { loadAuth, saveAuth, clearAuth } from './auth';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchSettings,
  saveSettings
} from './api';
import Header from './components/Header';
import TaskList from './components/TaskList';
import TaskEditor from './components/TaskEditor';
import Settings from './components/Settings';

export default function App() {
  const [auth, setAuth] = useState(loadAuth());
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [settings, setSettings] = useState({ title: 'Task Manager', logoUrl: '', dark: 'false' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;
    loadAppData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  async function loadAppData() {
    setLoading(true);
    try {
      const s = await fetchSettings(auth);
      if (s) setSettings(prev => ({ ...prev, ...s }));
      await reload();
    } catch (err) {
      console.error('Failed loading app data', err);
    } finally {
      setLoading(false);
    }
  }

  async function reload() {
    if (!auth) return;
    try {
      const t = await fetchTasks(auth);
      setTasks(t || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      setTasks([]);
    }
  }

  function onLogin(user, pass) {
    const a = { user, pass };
    saveAuth(a);
    setAuth(a);
  }

  function onLogout() {
    clearAuth();
    setAuth(null);
    setTasks([]);
  }

  async function addTask(payload) {
    await createTask(auth, payload);
    await reload();
  }

  async function saveTask(id, payload) {
    await updateTask(auth, id, payload);
    await reload();
    setEditing(null);
  }

  async function removeTask(id) {
    if (!confirm('Delete task?')) return;
    await deleteTask(auth, id);
    await reload();
  }

  async function saveGuiSettings(obj) {
    await saveSettings(auth, obj);
    setSettings(s => ({ ...s, ...obj }));
  }

  if (!auth) return <Unauthed onLogin={onLogin} />;

  return (
    <div className={settings.dark === 'true' ? 'app dark' : 'app'}>
      <Header title={settings.title} logoUrl={settings.logoUrl} onLogout={onLogout} />
      <main className="container">
        <section className="left">
          <TaskEditor onAdd={addTask} />
          <Settings settings={settings} onSave={saveGuiSettings} />
        </section>
        <section className="right">
          {loading ? <div>Loading...</div> : (
            <TaskList
              tasks={tasks}
              onEdit={setEditing}
              onDelete={removeTask}
              reload={reload}
              auth={auth}
            />
          )}
        </section>
      </main>

      {editing && (
        <EditModal
          task={editing}
          onClose={() => setEditing(null)}
          onSave={saveTask}
        />
      )}
    </div>
  );
}

function Unauthed({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!user || !pass) return alert('Username and password required');
    onLogin(user, pass);
  }

  return (
    <div className="login">
      <h2>Sign in</h2>
      <form onSubmit={submit}>
        <input
          placeholder="username"
          value={user}
          onChange={e => setUser(e.target.value)}
        />
        <input
          placeholder="password"
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="submit" className="btn">Sign in</button>
        </div>
      </form>
    </div>
  );
}

function EditModal({ task, onClose, onSave }) {
  const [title, setTitle] = useState(task.title || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [due_at, setDueAt] = useState(task.due_at ? isoForInput(task.due_at) : '');

  useEffect(() => {
    setTitle(task.title || '');
    setNotes(task.notes || '');
    setDueAt(task.due_at ? isoForInput(task.due_at) : '');
  }, [task]);

  function isoForInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  function submit(e) {
    e.preventDefault();
    if (!title) return alert('Title required');
    onSave(task.id, { title, notes, due_at });
  }

  return (
    <div className="modal" role="dialog">
      <div className="modal-body">
        <h3>Edit task</h3>
        <form onSubmit={submit}>
          <input value={title} onChange={e => setTitle(e.target.value)} />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} />
          <input type="datetime-local" value={due_at} onChange={e => setDueAt(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="btn">Save</button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
