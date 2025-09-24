const basicAuth = require('basic-auth');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

function getUser(username) {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  return row;
}

async function ensureInitialUser(username, password) {
  const existing = getUser(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log('created initial user', username);
  } else {
    console.log('user exists:', username);
  }
}

function authMiddleware(req, res, next) {
  const cred = basicAuth(req);
  if (!cred || !cred.name || !cred.pass) {
    res.set('WWW-Authenticate', 'Basic realm="TaskMgr"');
    return res.status(401).json({ error: 'Authentication required' });
  }
  const user = getUser(cred.name);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(cred.pass, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  req.user = { id: user.id, username: user.username };
  next();
}

module.exports = { ensureInitialUser, authMiddleware };
