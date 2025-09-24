// backend/src/index.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const api = require('./api');          // your routes (assumes router exported)
const { DB_PATH } = require('./db');  // assumes db.js exports DB_PATH and db

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const app = express();

// Logging
app.use(morgan('combined'));

// Basic JSON/body parsing for routes that need it (api routes can also use express.json() per-route)
app.use(express.json({ limit: '1mb' }));

// Ensure uploads directory exists (store uploads next to the DB file)
const dataDir = path.dirname(DB_PATH || path.join(__dirname, '..', 'data', 'db.sqlite'));
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files at /uploads/*
app.use('/uploads', express.static(uploadsDir));

// Mount API router at /api
app.use('/api', api);

// Optional: health check
app.get('/healthz', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Serve frontend build if available (optional)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // If no frontend build, provide a small root message
  app.get('/', (req, res) => res.send('Backend running'));
}

// Start scheduler if present
try {
  // scheduler.js should export start()
  // it will tolerate being required even if missing (wrap in try/catch)
  // eslint-disable-next-line global-require
  const scheduler = require('./scheduler');
  if (scheduler && typeof scheduler.start === 'function') {
    scheduler.start(Number(process.env.SCHED_INTERVAL_MS) || 60_000);
    console.log('Scheduler started');
  }
} catch (err) {
  console.warn('No scheduler started:', err.message || err);
}

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
});
