require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');

async function countRenewals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const leadRenewalCount = await Lead.countDocuments({ isRenewal: true });
    console.log(`Number of customers (Leads) with isRenewal = true: ${leadRenewalCount}`);

    const memTxRenewalCount = await MembershipTransaction.countDocuments({ isRenewal: true });
    console.log(`Number of MembershipTransactions with isRenewal = true: ${memTxRenewalCount}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
}

countRenewals();
