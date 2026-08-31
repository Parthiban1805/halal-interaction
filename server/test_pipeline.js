const mongoose = require('mongoose');
const Lead = require('./models/Lead');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const basePipeline = [
    { $match: { status: 'Won', isPipelineLead: true } },
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
      $addFields: {
        totalEventRevenue: { $sum: "$eventTx.amountPaid" },
        hasMemTx: { $gt: [{ $size: "$memTx" }, 0] },
        memNewRevenue: {
          $sum: {
            $map: {
              input: { $filter: { input: "$memTx", as: "tx", cond: { $ne: ["$$tx.isRenewal", true] } } },
              as: "tx",
              in: "$$tx.amountPaid"
            }
          }
        },
        memRenewalRevenue: {
          $sum: {
            $map: {
              input: { $filter: { input: "$memTx", as: "tx", cond: { $eq: ["$$tx.isRenewal", true] } } },
              as: "tx",
              in: "$$tx.amountPaid"
            }
          }
        }
      }
    },
    {
      $addFields: {
        finalNewRevenueInclusive: {
          $cond: [
            "$hasMemTx",
            "$memNewRevenue",
            { $cond: [{ $ne: ["$isRenewal", true] }, { $ifNull: ["$amountPaid", 0] }, 0] }
          ]
        },
        finalRenewalRevenueInclusive: {
          $cond: [
            "$hasMemTx",
            "$memRenewalRevenue",
            { $cond: [{ $eq: ["$isRenewal", true] }, { $ifNull: ["$amountPaid", 0] }, 0] }
          ]
        },
        finalNewRevenueExclusive: {
          $cond: [
            "$hasMemTx",
            { $divide: ["$memNewRevenue", 1.18] },
            { $cond: [{ $ne: ["$isRenewal", true] }, { $ifNull: ["$amountPaidExclusive", 0] }, 0] }
          ]
        },
        finalRenewalRevenueExclusive: {
          $cond: [
            "$hasMemTx",
            { $divide: ["$memRenewalRevenue", 1.18] },
            { $cond: [{ $eq: ["$isRenewal", true] }, { $ifNull: ["$amountPaidExclusive", 0] }, 0] }
          ]
        }
      }
    },
    {
      $group: {
        _id: "$assignedTo",
        totalInclusive: { $sum: { $add: ["$finalNewRevenueInclusive", "$finalRenewalRevenueInclusive", "$totalEventRevenue"] } },
        totalExclusive: { $sum: { $add: ["$finalNewRevenueExclusive", "$finalRenewalRevenueExclusive", "$totalEventRevenue"] } },
        newRevenueInclusive: { $sum: { $add: ["$finalNewRevenueInclusive", { $cond: [{ $ne: ["$isRenewal", true] }, "$totalEventRevenue", 0] }] } },
        newRevenueExclusive: { $sum: { $add: ["$finalNewRevenueExclusive", { $cond: [{ $ne: ["$isRenewal", true] }, "$totalEventRevenue", 0] }] } },
        renewalRevenueInclusive: { $sum: { $add: ["$finalRenewalRevenueInclusive", { $cond: [{ $eq: ["$isRenewal", true] }, "$totalEventRevenue", 0] }] } },
        renewalRevenueExclusive: { $sum: { $add: ["$finalRenewalRevenueExclusive", { $cond: [{ $eq: ["$isRenewal", true] }, "$totalEventRevenue", 0] }] } },
        dealsWon: { $sum: 1 }
      }
    }
  ];

  const aggData = await Lead.aggregate(basePipeline);
  console.log(JSON.stringify(aggData, null, 2));

  process.exit(0);
}

run().catch(console.error);
