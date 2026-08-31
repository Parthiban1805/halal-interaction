const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
require('dotenv').config({ path: './.env' });

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insta_crm');

  // Find Target Lead (nazu786751)
  const targetLead = await Lead.findOne({ instagramUsername: 'nazu786751' }) || await Lead.findOne({ name: 'FATHIMA NAZREEN' });
  if (!targetLead) {
    console.log("Target lead not found.");
    return mongoose.disconnect();
  }
  
  // Find Source Lead (fathima naazreen)
  const sourceLead = await Lead.findOne({ name: 'fathima naazreen', _id: { $ne: targetLead._id } });
  if (!sourceLead) {
    console.log("Source lead not found.");
    return mongoose.disconnect();
  }

  console.log(`Target Lead: ${targetLead._id} | ${targetLead.name} | ${targetLead.phone}`);
  console.log(`Source Lead: ${sourceLead._id} | ${sourceLead.name} | ${sourceLead.phone}`);

  // 1. Copy Notes
  if (sourceLead.notes && sourceLead.notes.length > 0) {
    console.log(`Copying ${sourceLead.notes.length} notes...`);
    targetLead.notes = [...targetLead.notes, ...sourceLead.notes];
    
    // Also copy statusHistory if they are tied to notes/events
    if (sourceLead.statusHistory) {
      targetLead.statusHistory = [...targetLead.statusHistory, ...sourceLead.statusHistory];
    }
  }

  // 2. Move Transactions
  const txs = await MembershipTransaction.find({ leadId: sourceLead._id });
  console.log(`Found ${txs.length} transactions to move.`);
  for (let tx of txs) {
    tx.leadId = targetLead._id;
    await tx.save();
  }

  // 3. Update Latest Membership
  if (sourceLead.latestMembership && sourceLead.latestMembership.tierId) {
    targetLead.latestMembership = sourceLead.latestMembership;
  }
  
  // Save Target Lead
  await targetLead.save();
  console.log("Target lead updated successfully.");

  // Delete source lead to prevent duplicates?
  // User didn't explicitly say delete, but usually that's the goal. We'll leave it as is or mark it deleted.
  sourceLead.isDeleted = true;
  await sourceLead.save();
  console.log("Source lead marked as deleted.");

  mongoose.disconnect();
}

migrate().catch(console.error);
