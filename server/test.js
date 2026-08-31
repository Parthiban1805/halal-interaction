require('mongoose').connect('mongodb+srv://vkaswinkanan:6kZ5pZkxkjCYEtOH@cluster0.7ejtsim.mongodb.net/prod?appName=Cluster1').then(async () => {
  const Lead = require('d:/DEVELOPMENT/insta_crm/server/models/Lead');
  
  // same logic as yesterday
  let nowIST = new Date(new Date().getTime() + (330 * 60 * 1000));
  nowIST.setUTCDate(nowIST.getUTCDate() - 1);
  const startYesterday = new Date(nowIST);
  startYesterday.setUTCHours(0, 0, 0, 0);
  const startLimit = new Date(startYesterday.getTime() - (330 * 60 * 1000));
  const endYesterday = new Date(nowIST);
  endYesterday.setUTCHours(23, 59, 59, 999);
  const endLimit = new Date(endYesterday.getTime() - (330 * 60 * 1000));

  const matchQuery = { status: 'Won', isPipelineLead: true };
  matchQuery.$or = [
    { statusHistory: { $elemMatch: { status: 'Won', timestamp: { $gte: startLimit, $lte: endLimit } } } },
    { 
      $and: [
        { $or: [ { statusHistory: { $exists: false } }, { statusHistory: { $size: 0 } }, { "statusHistory.status": { $ne: "Won" } } ] },
        { createdAt: { $gte: startLimit, $lte: endLimit } }
      ]
    }
  ];

  const aggData = await Lead.aggregate([
    { $match: matchQuery },
    {
      $addFields: {
        wonDate: {
          $let: {
            vars: {
              wonRecord: {
                $arrayElemAt: [
                  { $filter: { input: { $ifNull: ["$statusHistory", []] }, as: "hist", cond: { $eq: ["$$hist.status", "Won"] } } },
                  -1
                ]
              }
            },
            in: { $ifNull: ["$$wonRecord.timestamp", "$createdAt"] }
          }
        }
      }
    },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$wonDate", timezone: "Asia/Kolkata" } }, amount: { $sum: "$amountPaid" }, count: { $sum: 1 }, docs: { $push: "$_id" } } }
  ]);
  
  console.log("startLimit", startLimit);
  console.log("endLimit", endLimit);
  console.log("aggData", JSON.stringify(aggData, null, 2));
  process.exit(0);
});
