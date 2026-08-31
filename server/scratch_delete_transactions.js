require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');

async function deleteTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const lead = await Lead.findOne({ username: 'syed2samir' });
    if (!lead) {
      console.log('Lead with username syed2samir not found.');
      process.exit(1);
    }

    console.log(`Found lead: ${lead.name || 'Unknown'} (ID: ${lead._id})`);

    const memRes = await MembershipTransaction.deleteMany({ leadId: lead._id });
    console.log(`Deleted ${memRes.deletedCount} membership transactions.`);

    const evRes = await EventTransaction.deleteMany({ leadId: lead._id });
    console.log(`Deleted ${evRes.deletedCount} event transactions.`);

    lead.amountPaid = 0;
    lead.amountPaidExclusive = 0;
    await lead.save();
    console.log('Reset lead amountPaid to 0.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteTransactions();
