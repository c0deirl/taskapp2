// backend/src/index.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

// load db and immediately run migrations before anything that might query the DB
const { migrate } = require('./db');
migrate();

// now safe to load modules that query the database
const { ensureInitialUser } = require('./auth');
const api = require('./api');
const scheduler = require('./scheduler');

const app = express();
app.use(helmet());
app.use(cors());

// create initial admin user from env if provided
const defaultUser = process.env.ADMIN_USER || 'admin';
const defaultPass = process.env.ADMIN_PASS || 'admin';
ensureInitialUser(defaultUser, defaultPass);

app.use('/api', api);

const path = require('path');
const { DB_PATH } = require('./db');
const uploadsPath = path.join(path.dirname(DB_PATH), 'uploads');
app.use('/uploads', express.static(uploadsPath));


// static frontend if built
const frontendDist = path.join(__dirname, '..', 'frontend_dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`backend listening on ${port}`);
  scheduler.start(Number(process.env.SCHED_INTERVAL_MS) || 60000);
});

const api = require('./api');
app.use('/api', api);
