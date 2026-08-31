require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const LeadStatusHistory = require('./models/LeadStatusHistory');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const activities = await LeadStatusHistory.find()
      .populate('leadId', 'name username')
      .populate('changedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);
    console.log(activities);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
