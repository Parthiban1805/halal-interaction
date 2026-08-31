require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function fixAll() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const map = {
    'contacted': 'Contacted',
    'qualified': 'New',
    'converted': 'Won',
    'lost': 'Lost'
  };

  for (const [oldStatus, newStatus] of Object.entries(map)) {
    const result = await Lead.updateMany({ status: oldStatus }, { $set: { status: newStatus } });
    console.log(`Updated ${result.modifiedCount} leads from '${oldStatus}' to '${newStatus}'`);
  }
  
  process.exit(0);
}

fixAll();
