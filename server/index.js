const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cookieParser());

const CLIENTS = JSON.parse(fs.readFileSync(path.join(__dirname, '/data/client.json'), 'utf8'));
const SESSION_COOKIE_NAME = 'sessionId';
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
};

const generateSessionId = (clientId, clientSecret) => {
  return crypto.createHash('sha256')
    .update(`${clientId}:${clientSecret}`)
    .digest('hex')
    .substring(0, 12);
};

const checkAuth = (req, res, next) => {
  const sessionId = req.cookies[SESSION_COOKIE_NAME];
  if (sessionId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/initsdk', (req, res) => {
  const { customer } = req.body;
  const apiKey = req.headers['api-key'];

  const client = CLIENTS.find(client => client.apiKey === apiKey);
  if (!client) {
    return res.status(400).json({ error: 'Invalid API key' });
  }

  const sessionId = generateSessionId(client.clientId, client.clientSecret);
  const sessionToken = `${sessionId}-${client.apiKey}`;

  res.cookie(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
  res.json({ message: 'SDK initialized successfully' });
});

app.get('/devices', checkAuth, (req, res) => {
  res.json([
    { id: 1, name: 'Device 1' },
    { id: 2, name: 'Device 2' },
  ]);
});

app.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
  res.json({ message: 'Logged out successfully' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
