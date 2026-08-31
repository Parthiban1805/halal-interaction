require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');
const LeadStatusHistory = require('./models/LeadStatusHistory');

async function mergeMultipleLeads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const sourceLeadIds = ['6a5f37f0683eb940288ef3f8', '6a5f4771683eb940288f2b1d'];
    const targetLeadId = '6a3fefb66b8cfdcb95230cfa';

    const targetLead = await Lead.findById(targetLeadId);
    if (!targetLead) {
      console.log(`Could not find target lead (${targetLeadId})`);
      return;
    }
    console.log(`Target Lead ID: ${targetLead._id}`);

    for (const sourceId of sourceLeadIds) {
      const sourceLead = await Lead.findById(sourceId);
      if (!sourceLead) {
        console.log(`Could not find source lead (${sourceId})`);
        continue;
      }
      
      console.log(`\n--- Merging Source Lead ID: ${sourceLead._id} ---`);

      // 2. Transfer Membership Transactions
      const membershipResult = await MembershipTransaction.updateMany(
        { leadId: sourceLead._id },
        { $set: { leadId: targetLead._id } }
      );
      console.log(`Moved ${membershipResult.modifiedCount} membership transactions.`);

      // 3. Transfer Event Transactions
      const eventResult = await EventTransaction.updateMany(
        { leadId: sourceLead._id },
        { $set: { leadId: targetLead._id } }
      );
      console.log(`Moved ${eventResult.modifiedCount} event transactions.`);

      // 4. Transfer Notes and Status History (LeadStatusHistory)
      const notesResult = await LeadStatusHistory.updateMany(
        { leadId: sourceLead._id },
        { $set: { leadId: targetLead._id } }
      );
      console.log(`Moved ${notesResult.modifiedCount} notes/history records.`);

      // 5. Update Target Lead's name and city from the source lead if they are empty
      const updateFields = {};
      if (!targetLead.name && sourceLead.name) {
        updateFields.name = sourceLead.name;
        targetLead.name = sourceLead.name; // Keep local object in sync
      }
      if (!targetLead.city && sourceLead.city) {
        updateFields.city = sourceLead.city;
        targetLead.city = sourceLead.city; // Keep local object in sync
      }
      if (!targetLead.email && sourceLead.email) {
        updateFields.email = sourceLead.email;
        targetLead.email = sourceLead.email; // Keep local object in sync
      }
      
      // Explicitly set status to 'Won' as requested by user
      updateFields.status = 'Won';

      const updateOperation = {};
      if (Object.keys(updateFields).length > 0) {
        updateOperation.$set = updateFields;
      }

      // 6. Transfer embedded notes and history arrays
      const pushFields = {};
      if (sourceLead.notes && sourceLead.notes.length > 0) {
        pushFields.notes = { $each: sourceLead.notes };
      }
      if (sourceLead.notesHistory && sourceLead.notesHistory.length > 0) {
        pushFields.notesHistory = { $each: sourceLead.notesHistory };
      }
      if (sourceLead.statusHistory && sourceLead.statusHistory.length > 0) {
        pushFields.statusHistory = { $each: sourceLead.statusHistory };
      }

      if (Object.keys(pushFields).length > 0) {
        updateOperation.$push = pushFields;
      }

      if (Object.keys(updateOperation).length > 0) {
        // Use updateOne to bypass mongoose hooks, ensuring createdAt (and even updatedAt) remain strictly untouched.
        await Lead.updateOne({ _id: targetLead._id }, updateOperation);
        console.log('Updated target lead basic details and embedded notes/history from source lead without touching timestamps.');
      }
    }

    console.log('\nMigration completed successfully for all sources. You can now verify and delete the old leads.');

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

mergeMultipleLeads();
