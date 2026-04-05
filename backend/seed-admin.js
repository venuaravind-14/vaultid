require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const existing = await User.findOne({ email: 'vaultidadmin@vaultid.app' });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }

  await User.create({
    name: 'VaultID Admin',
    email: 'vaultidadmin@vaultid.app',
    password: 'Vault2026',  // will be bcrypt-hashed by the pre-save hook
    role: 'admin'
  });

  console.log('✅ Admin user created: vaultidadmin@vaultid.app / Vault2026');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });