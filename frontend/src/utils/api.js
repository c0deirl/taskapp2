const base = import.meta.env.VITE_API_BASE || '/api';

async function fetchJson(path, opts={}) {
  const headers = Object.assign({'Content-Type':'application/json'}, opts.headers||{});
  const res = await fetch(base + path, Object.assign({}, opts, { headers }));
  if (res.status === 204) return null;
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${txt}`);
  }
  return res.json();
}

export default {
  get: (p) => fetchJson(p, { method:'GET' }),
  post: (p, body) => fetchJson(p, { method:'POST', body: JSON.stringify(body) }),
  put: (p, body) => fetchJson(p, { method:'PUT', body: JSON.stringify(body) }),
  delete: (p) => fetchJson(p, { method:'DELETE' }),
};
