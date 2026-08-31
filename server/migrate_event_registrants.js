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
    console.log(`Found ${wonLeads.length} leads with 'Won' status`);

    let migratedCount = 0;

    for (const lead of wonLeads) {
      const hasMembership = await MembershipTransaction.exists({ leadId: lead._id });
      const hasEvent = await EventTransaction.exists({ leadId: lead._id });

      if (hasEvent && !hasMembership) {
        // They only paid for an event, not a membership
        lead.status = 'Event Registration';
        
        if (!lead.statusHistory) {
          lead.statusHistory = [];
        }

        lead.statusHistory.push({
          status: 'Event Registration',
          timestamp: new Date(),
          changedBy: null, // System migration
          notes: 'System migration: Converted from Won to Event Registration because no membership was found'
        });

        await lead.save();
        migratedCount++;
        console.log(`Migrated Lead ID: ${lead._id} to Event Registration`);
      }
    }

    console.log(`\nMigration completed! Successfully migrated ${migratedCount} leads.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run();
