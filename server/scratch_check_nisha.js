require('dotenv').config();
const mongoose = require('mongoose');
const EventTransaction = require('./models/EventTransaction');
const LeadStatusHistory = require('./models/LeadStatusHistory');

async function checkNisha() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const targetLeadId = '6a3d32a6ad8f268e7c515be8'; // Nisha

    const events = await EventTransaction.find({ leadId: targetLeadId });
    console.log(`Found ${events.length} event transactions for Nisha`);
    console.log(events);

    const history = await LeadStatusHistory.find({ leadId: targetLeadId });
    console.log(`Found ${history.length} history/notes records for Nisha`);
    console.log(history);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkNisha();
