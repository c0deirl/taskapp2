import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import TasksPage from './pages/TasksPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import api from './utils/api.js';
import './styles.css';

export default function App() {
  const [settings, setSettings] = useState({
    app_title: 'TaskMgr',
    app_logo: null,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await api.get('/settings');
        if (!mounted) return;
        setSettings({
          app_title: s?.app_title || 'TaskMgr',
          app_logo: s?.app_logo || null,
        });
      } catch (err) {
        console.error('failed to load settings', err);
      } finally {
        if (mounted) setLoadingSettings(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const HeaderLogo = () => {
    if (settings.app_logo) {
      // app_logo is a path like /uploads/logo.png or full URL
      return (
        <img
          src={settings.app_logo}
          alt="logo"
          className="logo"
          style={{ height: 44, width: 44, borderRadius: 10, objectFit: 'cover' }}
        />
      );
    }
    return <div className="logo-placeholder" />;
  };

  return (
    <BrowserRouter>
      <header className="header">
        <div className="brand">
          <HeaderLogo />
          <h1>{loadingSettings ? '...' : (settings.app_title || 'TaskMgr')}</h1>
        </div>

        <div className="header-actions">
          <Link to="/" className="btn ghost small" style={{ marginRight: 8 }}>Home</Link>
          <Link to="/settings" className="btn secondary small">Settings</Link>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
