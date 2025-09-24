import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import TasksPage from './pages/TasksPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import './styles.css';

export default function App() {
  return (
    <BrowserRouter>
      <header className="header">
        <div className="brand">
          <div className="logo-placeholder" />
          <h1>TaskMgr</h1>
        </div>
        <div className="header-actions">
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
