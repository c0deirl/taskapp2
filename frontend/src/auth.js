// Very simple in-memory auth for UI
export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem('taskmgr_auth')) || null;
  } catch { return null; }
}
export function saveAuth(auth) {
  localStorage.setItem('taskmgr_auth', JSON.stringify(auth));
}
export function clearAuth() {
  localStorage.removeItem('taskmgr_auth');
}
