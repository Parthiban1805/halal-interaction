require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function testStatusHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find a lead that has statusHistory populated
    const lead = await Lead.findOne({ statusHistory: { $exists: true, $not: {$size: 0} } }).sort({ updatedAt: -1 });
    
    if (lead) {
      console.log('--- FOUND LEAD ---');
      console.log(`Name: ${lead.name || lead.username || 'Unknown'}`);
      console.log(`Current Status: ${lead.status}`);
      console.log('--- STATUS HISTORY ---');
      console.log(JSON.stringify(lead.statusHistory, null, 2));
    } else {
      console.log('No leads with statusHistory found.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testStatusHistory();
