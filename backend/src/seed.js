require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { Admin } = require('./models');

async function seed() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    const existing = await Admin.findOne({ username: config.adminUsername });
    if (existing) {
      console.log(`Admin "${config.adminUsername}" already exists, skipping seed.`);
    } else {
      const hash = await bcrypt.hash(config.adminPassword, 12);
      await Admin.create({
        username: config.adminUsername,
        password_hash: hash,
        role: 'superadmin',
      });
      console.log(`✅ Admin "${config.adminUsername}" created successfully!`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
