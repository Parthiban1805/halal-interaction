require('dotenv').config();
const mongoose = require('mongoose');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');
const Lead = require('./models/Lead');
const User = require('./models/User'); // Required for populate if needed

async function migrateTransactionCreators() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let membershipUpdatedCount = 0;
    let eventUpdatedCount = 0;
    let noAgentCount = 0;

    // 1. Process Membership Transactions
    const membershipTransactions = await MembershipTransaction.find({ createdBy: { $exists: false } }).populate('leadId');
    console.log(`Found ${membershipTransactions.length} MembershipTransactions without a createdBy field.`);

    for (const tx of membershipTransactions) {
      if (tx.leadId && tx.leadId.assignedTo) {
        tx.createdBy = tx.leadId.assignedTo;
        await tx.save();
        membershipUpdatedCount++;
      } else {
        // Lead doesn't exist or has no assigned agent
        noAgentCount++;
      }
    }

    // 2. Process Event Transactions
    const eventTransactions = await EventTransaction.find({ createdBy: { $exists: false } }).populate('leadId');
    console.log(`Found ${eventTransactions.length} EventTransactions without a createdBy field.`);

    for (const tx of eventTransactions) {
      if (tx.leadId && tx.leadId.assignedTo) {
        tx.createdBy = tx.leadId.assignedTo;
        await tx.save();
        eventUpdatedCount++;
      } else {
        noAgentCount++;
      }
    }

    console.log(`\nMigration Complete!`);
    console.log(`- Membership Transactions Updated: ${membershipUpdatedCount}`);
    console.log(`- Event Transactions Updated: ${eventUpdatedCount}`);
    console.log(`- Transactions left null (No Agent assigned to Lead): ${noAgentCount}`);

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

migrateTransactionCreators();
