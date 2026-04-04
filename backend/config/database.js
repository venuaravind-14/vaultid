const mongoose = require('mongoose');
const User = require('../models/User');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas');
    await seedDefaults();
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

async function seedDefaults() {
  // Seed admin account if it doesn't exist
  const adminExists = await User.findOne({ email: 'admin@vaultid.app' });
  if (!adminExists) {
    await User.create({
      name: 'Admin',
      email: 'admin@vaultid.app',
      password: 'admin123',
      role: 'admin'
    });
    console.log('🌱 Seeded admin account: admin@vaultid.app / admin123');
  }

  // Seed demo user
  const demoExists = await User.findOne({ email: 'demo@vaultid.app' });
  if (!demoExists) {
    await User.create({
      name: 'Demo User',
      email: 'demo@vaultid.app',
      password: 'demo1234',
      role: 'user'
    });
    console.log('🌱 Seeded demo user: demo@vaultid.app / demo1234');
  }
}

// Mongoose connection events
mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

module.exports = connectDB ;