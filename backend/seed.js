const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Seed script to create initial admin user
const User = require('./models/User');
const { generateQRToken, generateQRCode } = require('./utils/qrUtils');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@hrm.com' });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const qrToken = generateQRToken();
    const qrCode = await generateQRCode(qrToken);

    await User.create({
      name: 'Admin',
      email: 'admin@hrm.com',
      password: 'admin123',
      role: 'admin',
      department: 'HR',
      position: 'Quản trị viên',
      qrToken,
      qrCode,
    });

    console.log('✅ Admin user created: admin@hrm.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
