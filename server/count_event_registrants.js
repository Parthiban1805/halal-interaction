require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const wonLeads = await Lead.find({ status: 'Won' });
    
    let countToMigrate = 0;

    for (const lead of wonLeads) {
      const hasMembership = await MembershipTransaction.exists({ leadId: lead._id });
      const hasEvent = await EventTransaction.exists({ leadId: lead._id });

      if (hasEvent && !hasMembership) {
        countToMigrate++;
      }
    }

    console.log(`\n================================`);
    console.log(`Leads in 'Won' status: ${wonLeads.length}`);
    console.log(`Leads that need migration to 'Event Registration': ${countToMigrate}`);
    console.log(`================================\n`);
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run();
