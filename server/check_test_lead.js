require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function testLead() {
  await mongoose.connect(process.env.MONGODB_URI);
  const leads = await Lead.find({ platformUserId: 'test_sender_123' });
  console.log('Test Leads Found:', leads);
  process.exit(0);
}
testLead();
