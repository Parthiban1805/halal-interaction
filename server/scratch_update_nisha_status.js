require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function updateStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Lead.updateOne(
      { _id: '6a3d32a6ad8f268e7c515be8' },
      { $set: { status: 'Event Registration' } }
    );
    console.log('Status updated.');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

updateStatus();
