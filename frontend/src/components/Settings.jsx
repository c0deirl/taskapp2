import React, { useState } from 'react';
export default function Settings({ settings, onSave }) {
  const [title, setTitle] = useState(settings.title || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [dark, setDark] = useState(settings.dark === 'true' ? 'true' : 'false');

  function submit(e) {
    e.preventDefault();
    onSave({ title, logoUrl, dark });
  }

  return (
    <form className="settings" onSubmit={submit}>
      <h3>UI Settings</h3>
      <input placeholder="App title" value={title} onChange={e => setTitle(e.target.value)} />
      <input placeholder="Logo URL" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
      <label><input type="checkbox" checked={dark==='true'} onChange={e => setDark(e.target.checked ? 'true' : 'false')} /> Dark mode</label>
      <button type="submit">Save</button>
    </form>
  );
}
