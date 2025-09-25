import React, { useState } from 'react';
export default function TaskEditor({ onAdd }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [due_at, setDueAt] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!title) return alert('Title required');
    await onAdd({ title, notes, due_at });
    setTitle(''); setNotes(''); setDueAt('');
  }

  return (
    <form className="task-editor" onSubmit={submit}>
      <input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
      <input type="datetime-local" value={due_at} onChange={e => setDueAt(e.target.value)} />
      <button type="submit">Add task</button>
    </form>
  );
}
