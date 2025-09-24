import React from 'react';
export default function Header({ title, logoUrl, onLogout }) {
  return (
    <header className="header">
      <div className="brand">
        {logoUrl ? <img src={logoUrl} alt="logo" className="logo" /> : <div className="logo-placeholder" />}
        <h1>{title || 'Task Manager'}</h1>
      </div>
      <div>
        <button className="btn" onClick={onLogout}>Sign out</button>
      </div>
    </header>
  );
}
