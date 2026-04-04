require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const connectDB  = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

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
