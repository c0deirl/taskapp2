// frontend/src/api.js
import axios from 'axios';

const base = import.meta.env.VITE_API_BASE || '/api';

function authHeaders(auth) {
  if (!auth || !auth.user || !auth.pass) return {};
  const token = btoa(`${auth.user}:${auth.pass}`);
  return { Authorization: `Basic ${token}` };
}

function handleError(err) {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') throw new Error(data);
    if (data.error) throw new Error(data.error);
    throw new Error(JSON.stringify(data));
  }
  throw err;
}

/* Tasks */
export async function fetchTasks(auth) {
  try {
    const res = await axios.get(`${base}/tasks`, { headers: authHeaders(auth) });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function createTask(auth, payload) {
  try {
    const res = await axios.post(`${base}/tasks`, payload, { headers: authHeaders(auth) });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function updateTask(auth, id, payload) {
  try {
    const res = await axios.put(`${base}/tasks/${id}`, payload, { headers: authHeaders(auth) });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function deleteTask(auth, id) {
  try {
    await axios.delete(`${base}/tasks/${id}`, { headers: authHeaders(auth) });
  } catch (err) {
    handleError(err);
  }
}

/* Settings */
export async function fetchSettings(auth) {
  try {
    const res = await axios.get(`${base}/settings`, { headers: authHeaders(auth) });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function saveSettings(auth, obj) {
  try {
    const res = await axios.post(`${base}/settings`, obj, { headers: authHeaders(auth) });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

/* Reminders */
export async function fetchReminders(auth, taskId) {
  try {
    const res = await axios.get(`${base}/tasks/${taskId}/reminders`, { headers: authHeaders(auth) });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function createReminder(auth, taskId, payload) {
  try {
    const res = await axios.post(`${base}/tasks/${taskId}/reminders`, payload, { headers: authHeaders(auth) });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function updateReminder(auth, id, payload) {
  try {
    const res = await axios.put(`${base}/reminders/${id}`, payload, { headers: authHeaders(auth) });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function deleteReminder(auth, id) {
  try {
    await axios.delete(`${base}/reminders/${id}`, { headers: authHeaders(auth) });
  } catch (err) {
    handleError(err);
  }
}

/* Helpers */
export function formatIsoForInput(iso) {
  if (!iso) return '';
  // Trim trailing Z and ensure local datetime-local compatible format (YYYY-MM-DDTHH:MM)
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

export function copyToClipboard(text) {
  if (!navigator?.clipboard) {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve();
    } catch (e) {
      document.body.removeChild(ta);
      return Promise.reject(e);
    }
  }
  return navigator.clipboard.writeText(text);
}
