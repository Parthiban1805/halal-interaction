const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Lead = require('./models/Lead');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Target Date: 22/7/2026 07:54 pm -> July 22, 2026 19:54:00 (IST which is UTC+5:30)
    const targetDate = new Date('2026-07-22T14:24:00Z');

    const lead = await Lead.findOne({ username: '3432_rahmat' });
    if (!lead) {
      console.log('Lead not found!');
      process.exit(1);
    }
    
    let leadChanged = false;
    
    if (lead.statusHistory && lead.statusHistory.length > 0) {
       for (let i = 0; i < lead.statusHistory.length; i++) {
         if (lead.statusHistory[i].status === 'Event Registration') {
           lead.statusHistory[i].timestamp = targetDate;
           leadChanged = true;
           console.log('Updated embedded statusHistory timestamp!');
         }
       }
    }
    
    if (leadChanged) {
      lead.markModified('statusHistory');
      await lead.save();
      console.log('Lead saved successfully with new statusHistory timestamp');
    } else {
      console.log('No Event Registration status found in statusHistory!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
