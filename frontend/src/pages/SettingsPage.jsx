// frontend/src/pages/SettingsPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';

export default function SettingsPage() {
  const [ntfyServer, setNtfyServer] = useState('');
  const [ntfyTopic, setNtfyTopic] = useState('');
  const [appTitle, setAppTitle] = useState('');
  const [appLogo, setAppLogo] = useState(null); // url
  const [logoFile, setLogoFile] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(()=>{ (async ()=> {
    try {
      const s = await api.get('/settings');
      setNtfyServer(s?.ntfy_server || '');
      setNtfyTopic(s?.ntfy_topic || '');
      setAppTitle(s?.app_title || '');
      setAppLogo(s?.app_logo || null);
    } catch(e){ console.error(e) }
  })(); }, []);

  const save = async () => {
    await api.post('/settings', { ntfy_server: ntfyServer || null, ntfy_topic: ntfyTopic || null, app_title: appTitle || null });
    setSaved(true);
    setTimeout(()=>setSaved(false), 1500);
  };

  const onPickLogo = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setLogoFile(f);
    setAppLogo(URL.createObjectURL(f));
  };

  const uploadLogo = async () => {
    if (!logoFile) return;
    const fd = new FormData();
    fd.append('logo', logoFile);
    // fetch via api wrapper - use native fetch because api wrapper assumes JSON
    const base = import.meta.env.VITE_API_BASE || '/api';
    const res = await fetch(base + '/settings/logo', { method:'POST', body: fd });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'upload failed');
    }
    const body = await res.json();
    setAppLogo(body.logo); // url relative to frontend origin
    setLogoFile(null);
  };

  return (
    <div className="settings-container">
      <div className="left settings">
        <h3>Application</h3>
        <label>App title</label>
        <input type="text" value={appTitle} onChange={e=>setAppTitle(e.target.value)} placeholder="TaskMgr" />
        <label>Logo</label>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div style={{width:64,height:64,borderRadius:10,overflow:'hidden',background:'rgba(255,255,255,0.02)'}}>
            {appLogo ? <img src={appLogo} alt="logo" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>No logo</div>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <input type="file" accept="image/*" onChange={onPickLogo} />
            <div style={{display:'flex',gap:8}}>
              <button className="btn small" onClick={uploadLogo} disabled={!logoFile}>Upload</button>
              <button className="btn secondary small" onClick={()=>{ setAppLogo(null); setLogoFile(null); api.post('/settings', { app_title: appTitle || null }); }}>Clear</button>
            </div>
          </div>
        </div>

        <div style={{marginTop:18}}>
          <h3>Notifications - NTFY</h3>
          <label>Default NTFY server URL</label>
          <input type="text" placeholder="https://ntfy.sh" value={ntfyServer} onChange={e=>setNtfyServer(e.target.value)} />
          <label>Default topic</label>
          <input type="text" placeholder="my-topic" value={ntfyTopic} onChange={e=>setNtfyTopic(e.target.value)} />
        </div>

        <div style={{marginTop:12, display:'flex', gap:8}}>
          <button className="btn" onClick={save}>Save</button>
          <button className="btn secondary" onClick={()=>{ setNtfyServer(''); setNtfyTopic(''); setAppTitle(''); }}>Reset</button>
        </div>
        {saved && <div className="muted" style={{marginTop:10}}>Settings saved</div>}
      </div>

      <div className="right">
        <h3>Preview</h3>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:72,height:72,borderRadius:12,overflow:'hidden',background:'transparent'}}>
            {appLogo ? <img src={appLogo} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="logo" /> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>No logo</div>}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:18}}>{appTitle || 'TaskMgr'}</div>
            <div className="muted">Preview of header</div>
          </div>
        </div>
      </div>
    </div>
  );
}
