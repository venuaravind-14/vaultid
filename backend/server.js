require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const path     = require('path');
const fs       = require('fs');
const session  = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
require('./config/passport');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Uploads directory ─────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Session ───────────────────────────────────────────────────
// MemoryStore is fine for this app — single dyno, sessions are
// short-lived and JWT handles auth. Warning is just noise.
app.use(session({
  secret:            process.env.JWT_SECRET || 'vaultid_dev_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   24 * 60 * 60 * 1000
  }
}));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://vaultid.netlify.app',
  'https://vaultid-ubsw.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logger ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Passport ──────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Static files ──────────────────────────────────────────────
app.use('/uploads', express.static(uploadDir));

const frontendPath = path.join(__dirname, '../frontend');
console.log('📁 Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/cards',     require('./routes/cards'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/files',     require('./routes/files'));
app.use('/api/admin',     require('./routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    database:  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    app:       'VaultID API v2.0'
  });
});

// ── API 404 (before frontend catch-all) ───────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Frontend catch-all ────────────────────────────────────────
// FIX: Express 5 requires '/*' not '*'
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'vault.html'));
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🔐 VaultID Backend  →  http://localhost:${PORT}`);
    console.log(`🍃 Database        →  MongoDB Atlas`);
    console.log(`📋 Health check    →  http://localhost:${PORT}/api/health\n`);
  });
});

module.exports = app;