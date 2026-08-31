const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const MembershipTier = require('./models/MembershipTier');
require('dotenv').config({ path: './.env' });

async function analyzeTiers() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insta_crm');

  const startLimit = new Date();
  startLimit.setDate(1);
  startLimit.setHours(0,0,0,0);
  const endLimit = new Date();
  
  // 1. Revenue Dashboard Tier Logic
  // It uses transaction Date for the period
  const memTxs = await MembershipTransaction.find({ 
    transactionDate: { $gte: startLimit, $lte: endLimit },
    isCancellation: { $ne: true }
  }).populate('tierId');

  let revTiers = {};
  memTxs.forEach(tx => {
    if (!tx.tierId) return;
    const tierName = tx.tierId.name;
    if (!revTiers[tierName]) revTiers[tierName] = { new: 0, renewals: 0, upgrades: 0 };
    if (tx.isRenewal) revTiers[tierName].renewals++;
    else if (tx.isUpgrade) revTiers[tierName].upgrades++;
    else revTiers[tierName].new++;
  });
  
  console.log("--- Revenue Dashboard (Transactions this month) ---");
  console.table(revTiers);

  // 2. Customers Page Logic (Filtered to this month)
  // How does the customers page date filter work?
  // Let's check leads created this month vs won this month vs transaction this month
  const customersCreatedThisMonth = await Lead.find({
    isPipelineLead: true,
    status: 'Won',
    isDeleted: { $ne: true },
    createdAt: { $gte: startLimit, $lte: endLimit }
  }).populate('latestMembership.tierId');

  let custCreatedTiers = {};
  customersCreatedThisMonth.forEach(c => {
    if (!c.latestMembership || !c.latestMembership.tierId) return;
    const tierName = c.latestMembership.tierId.name;
    if (!custCreatedTiers[tierName]) custCreatedTiers[tierName] = 0;
    custCreatedTiers[tierName]++;
  });

  console.log("\n--- Customers Page (Leads CREATED this month & Won) ---");
  console.table(custCreatedTiers);

  const customersWonThisMonth = await Lead.find({
    isPipelineLead: true,
    status: 'Won',
    isDeleted: { $ne: true },
    statusHistory: { $elemMatch: { status: 'Won', timestamp: { $gte: startLimit, $lte: endLimit } } }
  }).populate('latestMembership.tierId');

  let custWonTiers = {};
  customersWonThisMonth.forEach(c => {
    if (!c.latestMembership || !c.latestMembership.tierId) return;
    const tierName = c.latestMembership.tierId.name;
    if (!custWonTiers[tierName]) custWonTiers[tierName] = 0;
    custWonTiers[tierName]++;
  });

  console.log("\n--- Customers Page (Leads CONVERTED TO WON this month) ---");
  console.table(custWonTiers);

  mongoose.disconnect();
}

analyzeTiers().catch(console.error);
