require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = 'admin@gmail.com';
    const password = '123456';
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Admin user already exists!');
      console.log(`Email: ${email}`);
      console.log('Please login with your existing password or delete the user to recreate.');
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Super Admin',
      email: email,
      password: password,
      role: 'admin' // Assuming role field exists, otherwise it just ignores
    });

    console.log('✅ Admin credentials successfully created!');
    console.log('----------------------------------------');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('----------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exit(1);
  }
};

createAdmin();
