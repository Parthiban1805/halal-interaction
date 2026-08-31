require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');

async function checkLead() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const usernameToFind = 'syed2samir';
    const lead = await Lead.findOne({ username: usernameToFind });
    
    if (!lead) {
      console.log(`\n❌ Lead with username '${usernameToFind}' NOT FOUND.`);
      process.exit(1);
    }

    console.log(`\n✅ FOUND LEAD:`);
    console.log(`- ID: ${lead._id}`);
    console.log(`- Name: ${lead.name || 'N/A'}`);
    console.log(`- Username: ${lead.username}`);
    console.log(`- Status: ${lead.status}`);
    console.log(`- Current Amount Paid: ₹${lead.amountPaid}`);

    const memTxs = await MembershipTransaction.find({ leadId: lead._id });
    console.log(`\n📊 MEMBERSHIP TRANSACTIONS (${memTxs.length}):`);
    memTxs.forEach((tx, i) => {
      console.log(`  ${i + 1}. ID: ${tx._id}, Amount: ₹${tx.amountPaid}, Date: ${tx.transactionDate}`);
    });

    const evTxs = await EventTransaction.find({ leadId: lead._id });
    console.log(`\n🎟️ EVENT TRANSACTIONS (${evTxs.length}):`);
    evTxs.forEach((tx, i) => {
      console.log(`  ${i + 1}. ID: ${tx._id}, Amount: ₹${tx.amountPaid}, Date: ${tx.transactionDate}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLead();
