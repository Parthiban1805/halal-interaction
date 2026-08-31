require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const potentialLeads = await Lead.find({
    status: 'Event Registration',
    amountPaid: { $gt: 0 }
  });

  const incorrectLeads = [];
  for (const lead of potentialLeads) {
    if (lead.statusHistory && lead.statusHistory.length > 0) {
      const history = [...lead.statusHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      const wonIndex = history.map(h => h.status).lastIndexOf('Won');
      const eventIndex = history.map(h => h.status).lastIndexOf('Event Registration');
      
      // If they were "Won" at some point, and were later changed to "Event Registration"
      if (wonIndex !== -1 && eventIndex > wonIndex) {
        incorrectLeads.push({
          id: lead._id.toString(),
          name: lead.name,
          amountPaid: lead.amountPaid,
          wonDate: history[wonIndex].timestamp.toLocaleDateString(),
          downgradedDate: history[eventIndex].timestamp.toLocaleDateString()
        });
      }
    }
  }

  console.log(`Found ${incorrectLeads.length} leads that are likely legacy members and were incorrectly downgraded.`);
  console.table(incorrectLeads);

  mongoose.disconnect();
}
run();
