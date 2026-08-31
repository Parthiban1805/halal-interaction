require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const startLimit = new Date();
  startLimit.setHours(0,0,0,0);
  const endLimit = new Date();
  
  const paidStatuses = ['Won', 'Event Registration', 'Trial Membership'];
  
  const matchQuery = { 
    isPipelineLead: true,
    $or: [
      { statusHistory: { $elemMatch: { status: { $in: paidStatuses }, timestamp: { $gte: startLimit, $lte: endLimit } } } },
      { 
        $and: [
          { $or: [ { statusHistory: { $exists: false } }, { statusHistory: { $size: 0 } }, { "statusHistory.status": { $nin: paidStatuses } } ] },
          { createdAt: { $gte: startLimit, $lte: endLimit } }
        ]
      }
    ]
  };

  const aggData = await Lead.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: "eventtransactions",
        localField: "_id",
        foreignField: "leadId",
        as: "eventTx"
      }
    },
    {
      $lookup: {
        from: "membershiptransactions",
        localField: "_id",
        foreignField: "leadId",
        as: "memTx"
      }
    },
    {
      $project: {
        name: 1,
        status: 1,
        eventTxAmount: { $sum: "$eventTx.amountPaid" },
        memTxAmount: { $sum: "$memTx.amountPaid" },
        fallbackAmount: "$amountPaid"
      }
    }
  ]);

  console.log('Leads generating revenue today with breakdown:');
  for (const l of aggData) {
    if (l.eventTxAmount > 0 || l.memTxAmount > 0 || l.fallbackAmount > 0) {
      console.log(`- ${l.name} (Status: ${l.status}) | EventRev: ${l.eventTxAmount} | MemRev: ${l.memTxAmount} | FallbackRev: ${l.fallbackAmount}`);
    }
  }
  
  mongoose.disconnect();
}
run();
