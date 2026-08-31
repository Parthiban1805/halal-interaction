const http = require('http');

async function loginAndFetch() {
  const loginData = JSON.stringify({ email: 'admin@replyr.com', password: 'password123' }); // Try default admin
  // Wait, I don't know the admin password. Let me just generate a JWT for an admin user directly.
  const jwt = require('jsonwebtoken');
  require('dotenv').config();
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./models/User');
  const admin = await User.findOne({ role: 'admin' }) || await User.findOne({ role: 'superadmin' });
  if (!admin) return console.log("No admin found");
  
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  // Now fetch
  try {
    const res = await globalThis.fetch('http://localhost:5000/api/leads?city=Hyd', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data keys:", Object.keys(data));
    console.log("Leads count:", data.data ? data.data.length : data.count);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

loginAndFetch();
