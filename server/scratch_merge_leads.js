require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');
const LeadStatusHistory = require('./models/LeadStatusHistory');

async function mergeLeads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Find both leads by ID
    const sourceLead = await Lead.findById('6a70ae174f4c5bcea1c8b837'); // Source lead (shaukath - newer)
    const targetLead = await Lead.findById('6a6ebc564f4c5bcea1c8ac9b'); // Target lead (shaukath - older)

    if (!sourceLead) {
      console.log("Could not find source lead (shaukath - 6a70ae174f4c5bcea1c8b837)");
      return;
    }
    
    if (!targetLead) {
      console.log("Could not find target lead (shaukath - 6a6ebc564f4c5bcea1c8ac9b)");
      return;
    }

    console.log(`Source Lead ID: ${sourceLead._id}`);
    console.log(`Target Lead ID: ${targetLead._id}`);

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
    }
    if (!targetLead.city && sourceLead.city) {
      updateFields.city = sourceLead.city;
    }
    if (!targetLead.email && sourceLead.email) {
      updateFields.email = sourceLead.email;
    }
    if (sourceLead.status !== targetLead.status) {
      updateFields.status = sourceLead.status;
    }

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

    console.log('Migration completed successfully. You can now verify and delete the old lead.');

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

mergeLeads();
