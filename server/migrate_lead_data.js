require('dotenv').config();
const mongoose = require('mongoose');

const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');

async function migrateLeadData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Identify Target Lead (the one with +91996212248)
    const targetLead = await Lead.findOne({ phone: { $regex: '99621.*?2248$' } });
    if (!targetLead) {
      console.log('Target Lead not found. Check phone number.');
      process.exit(1);
    }
    console.log(`Target Lead: ${targetLead._id} / ${targetLead.username || targetLead.name} / ${targetLead.phone}`);

    // 2. Identify Source Lead (the one with phone ending in 22483)
    const sourceLead = await Lead.findOne({ phone: { $regex: '99621.*?22483$' } });
    if (!sourceLead) {
      console.log('Source Lead not found. Check phone number.');
      process.exit(1);
    }
    console.log(`Source Lead: ${sourceLead._id} / ${sourceLead.name} / ${sourceLead.phone}`);

    // Confirm they are different
    if (sourceLead._id.toString() === targetLead._id.toString()) {
      console.log('Source and Target leads are the same. Nothing to move.');
      process.exit(1);
    }

    // 3. Move Transactions (Membership & Event)
    const memTxResult = await mongoose.connection.db.collection('membershiptransactions').updateMany(
      { leadId: sourceLead._id },
      { $set: { leadId: targetLead._id } }
    );
    console.log(`Moved ${memTxResult.modifiedCount} membership transactions to Target Lead.`);

    const eventTxResult = await mongoose.connection.db.collection('eventtransactions').updateMany(
      { leadId: sourceLead._id },
      { $set: { leadId: targetLead._id } }
    );
    console.log(`Moved ${eventTxResult.modifiedCount} event transactions to Target Lead.`);

    // 4. Move Notes (embedded in Lead document)
    if (sourceLead.notes && sourceLead.notes.length > 0) {
      // Append source notes to target lead's notes using raw db adapter to bypass Mongoose timestamp updates
      await mongoose.connection.db.collection('leads').updateOne(
        { _id: targetLead._id },
        { $push: { notes: { $each: sourceLead.notes } } }
      );
      // Remove them from source lead
      await mongoose.connection.db.collection('leads').updateOne(
        { _id: sourceLead._id },
        { $set: { notes: [] } }
      );
      console.log(`Moved ${sourceLead.notes.length} notes to Target Lead.`);
    } else {
      console.log('No notes found in Source Lead to move.');
    }

    // 5. Update Target Lead Details (Name, City, Status)
    const updateData = {};
    if (sourceLead.status === 'Won') {
      updateData.status = 'Won';
    }
    if (sourceLead.name) {
      updateData.name = sourceLead.name;
    }
    if (sourceLead.city) {
      updateData.city = sourceLead.city;
    }

    if (Object.keys(updateData).length > 0) {
      // Using raw updateOne to prevent updating target lead's updatedAt timestamp?
      // Actually, updating name/city/status means it's been updated, so letting Mongoose update `updatedAt` on the Lead is fine.
      await Lead.findByIdAndUpdate(targetLead._id, updateData);
      console.log('Updated target lead with status, name, and city:', updateData);
    }

    console.log('Migration complete!');
    process.exit(0);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateLeadData();
