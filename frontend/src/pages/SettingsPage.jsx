import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
export default function SettingsPage() {
  const [ntfyServer, setNtfyServer] = useState('');
  const [ntfyTopic, setNtfyTopic] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(()=>{ (async ()=> {
    try {
      const s = await api.get('/settings');
      setNtfyServer(s?.ntfy_server || '');
      setNtfyTopic(s?.ntfy_topic || '');
    } catch(e){}
  })(); }, []);

  const save = async () => {
    await api.post('/settings', { ntfy_server: ntfyServer || null, ntfy_topic: ntfyTopic || null });
    setSaved(true);
    setTimeout(()=>setSaved(false), 1500);
  };

  return (
    <div style={{gridColumn:'1/-1', display:'flex', gap:20}}>
      <div className="left settings">
        <h3>Notifications - NTFY</h3>
        <label className="muted">Default NTFY server URL</label>
        <input placeholder="https://ntfy.sh" value={ntfyServer} onChange={e=>setNtfyServer(e.target.value)} />
        <label className="muted">Default topic</label>
        <input placeholder="my-topic" value={ntfyTopic} onChange={e=>setNtfyTopic(e.target.value)} />
        <div style={{marginTop:12, display:'flex', gap:8}}>
          <button className="btn" onClick={save}>Save</button>
          <button className="btn secondary" onClick={()=>{ setNtfyServer(''); setNtfyTopic(''); }}>Reset</button>
        </div>
        {saved && <div className="muted" style={{marginTop:10}}>Settings saved</div>}
      </div>
      <div className="right">
        <h3>Preview</h3>
        <div className="task">
          <div>
            <div className="task-title">Example reminder</div>
            <div className="task-due muted">NTFY → {ntfyServer || 'https://ntfy.sh'} / {ntfyTopic || 'topic'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
