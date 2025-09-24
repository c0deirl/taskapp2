import React, { useState } from 'react';
import RemindersPanel from './RemindersPanel';
export default function TaskList({ tasks, onEdit, onDelete, reload, auth }) {
  const [openTask, setOpenTask] = useState(null);

  if (!tasks) return null;
  return (
    <div className="task-list">
      {tasks.map(t => (
        <div key={t.id} className="task">
          <div style={{ flex: 1 }}>
            <div className="task-title">{t.title}</div>
            <div className="task-due">{t.due_at ? new Date(t.due_at).toLocaleString() : ''}</div>
          </div>
          <div className="task-actions">
            <button onClick={() => onEdit(t)}>Edit</button>
            <button onClick={() => setOpenTask(t)}>Reminders</button>
            <button onClick={() => onDelete(t.id)}>Delete</button>
          </div>
        </div>
      ))}
      <button onClick={reload} className="refresh">Refresh</button>

      {openTask && (
        <RemindersPanel auth={auth} task={openTask} onClose={() => setOpenTask(null)} onReload={reload} />
      )}
    </div>
  );
}
