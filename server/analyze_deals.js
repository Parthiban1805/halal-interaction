const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');
require('dotenv').config({ path: './.env' });

async function analyze() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insta_crm');

  const startLimit = new Date();
  startLimit.setDate(1);
  startLimit.setHours(0,0,0,0);
  const endLimit = new Date();
  
  const kpiQuery = { 
    isPipelineLead: true, 
    status: 'Won', 
    priority: 'hot', 
    isDeleted: { $ne: true }, 
    isCancellation: { $ne: true },
    statusHistory: { $elemMatch: { status: 'Won', timestamp: { $gte: startLimit, $lte: endLimit } } }
  };
  const kpiIds = await Lead.find(kpiQuery).select('_id');
  const kpiIdSet = new Set(kpiIds.map(l => l._id.toString()));

  const revData = await Lead.aggregate([
    {
      $match: {
        isPipelineLead: true,
        $or: [
          { status: { $in: ['Won', 'Event Registration'] } },
          { "statusHistory.status": { $in: ['Won', 'Event Registration'] } }
        ]
      }
    },
    {
      $lookup: {
        from: 'membershiptransactions',
        let: { leadId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$leadId", "$$leadId"] } } },
          { $match: { transactionDate: { $gte: startLimit, $lte: endLimit } } }
        ],
        as: 'memTx'
      }
    },
    {
      $lookup: {
        from: 'eventtransactions',
        let: { leadId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$leadId", "$$leadId"] } } },
          { $match: { transactionDate: { $gte: startLimit, $lte: endLimit } } }
        ],
        as: 'eventTx'
      }
    }
  ]);
  
  let revIds = [];
  let revDetails = {};
  revData.forEach(lead => {
    const hasTransactionInPeriod = (lead.memTx && lead.memTx.length > 0) || (lead.eventTx && lead.eventTx.length > 0);
    if (!lead.isDeleted && !lead.isCancellation && ['Won', 'Event Registration'].includes(lead.status) && hasTransactionInPeriod) {
      revIds.push(lead._id.toString());
      revDetails[lead._id.toString()] = { priority: lead.priority, status: lead.status, history: lead.statusHistory };
    }
  });

  const inRevNotKpi = revIds.filter(id => !kpiIdSet.has(id));
  console.log(`\n--- 8 Leads in Revenue but NOT in KPI ---`);
  inRevNotKpi.forEach(id => {
    const l = revDetails[id];
    let wonTime = l.history.find(h => h.status === 'Won')?.timestamp;
    if (!wonTime) wonTime = 'Never/Not Won';
    console.log(`ID: ${id} | Priority: ${l.priority} | Status: ${l.status} | Won Date: ${wonTime}`);
  });

  mongoose.disconnect();
}

analyze().catch(console.error);
