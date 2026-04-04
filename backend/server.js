require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const connectDB  = require('./config/database');
try {
  const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User'); // Make sure this path points to your User model!

// Teach Passport what the "google" strategy is
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      // 1. Check if this user already exists in your database
      let user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
      
      if (user) {
        // User exists, log them in
        return done(null, user);
      } else {
        // 2. User doesn't exist, create a new account for them!
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value.toLowerCase(),
          role: 'user',
          // Since they logged in with Google, they don't have a standard password.
          // You can generate a random string or leave it empty if your schema allows.
          password: Math.random().toString(36).slice(-8) + 'A1!' 
        });
        return done(null, user);
      }
    } catch (err) {
      console.error(err);
      return done(err, null);
    }
  }
));
  require('./config/passport'); // Load passport config
} catch (err) {
  console.error('⚠️  Passport config failed (Google OAuth may be unavailable):', err.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:5500', 'http://127.0.0.1:5500',
    'https://vaultid.netlify.app',
    'https://vaultid-ubsw.onrender.com',
    process.env.FRONTEND_URL
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded card images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/cards',     require('./routes/cards'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/files',     require('./routes/files'));
app.use('/api/admin',     require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    app: 'VaultID API v2.0 (MongoDB Atlas)'
  });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Connect to MongoDB Atlas, then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🔐 VaultID Backend  →  http://localhost:${PORT}`);
    console.log(`🍃 Database        →  MongoDB Atlas`);
    console.log(`📋 Health check    →  http://localhost:${PORT}/api/health`);
    console.log(`👤 Demo admin      →  admin@vaultid.app / admin123`);
    console.log(`👤 Demo user       →  demo@vaultid.app / demo1234\n`);
  });
});

module.exports = app;