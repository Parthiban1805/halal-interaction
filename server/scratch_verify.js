const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Lead = require('./models/Lead');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const lead = await Lead.findOne({ username: '3432_rahmat' });
    console.log('Lead statusHistory:', lead.statusHistory);
    console.log('Lead createdAt:', lead.createdAt);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
