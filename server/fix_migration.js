require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const potentialLeads = await Lead.find({
    status: 'Event Registration',
    amountPaid: { $gt: 0 }
  });

  let restoredCount = 0;

  for (const lead of potentialLeads) {
    if (lead.statusHistory && lead.statusHistory.length > 0) {
      // Create a sorted copy to safely find indexes
      const historyCopy = [...lead.statusHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      const wonIndex = historyCopy.map(h => h.status).lastIndexOf('Won');
      const eventIndex = historyCopy.map(h => h.status).lastIndexOf('Event Registration');
      
      // If they were "Won" at some point and later downgraded to "Event Registration"
      if (wonIndex !== -1 && eventIndex > wonIndex) {
        
        // 1. Restore the main status
        lead.status = 'Won';
        
        // 2. To ensure the wonDate isn't changed to today, we simply REMOVE the incorrect 
        // "Event Registration" entry from the history array.
        // This restores their timeline exactly as it was before the bad migration ran,
        // so the pipeline will correctly pick up their original "Won" date!
        
        // Find the actual index in the raw array to splice it
        const rawEventIndex = lead.statusHistory.map(h => h.status).lastIndexOf('Event Registration');
        if (rawEventIndex !== -1) {
          lead.statusHistory.splice(rawEventIndex, 1);
        }

        await lead.save();
        restoredCount++;
        console.log(`Restored Lead: ${lead.name} (Removed bad Event Registration history entry)`);
      }
    }
  }

  console.log(`\nSuccessfully restored ${restoredCount} leads back to 'Won' status without altering their original Won date!`);
  mongoose.disconnect();
}

run();
