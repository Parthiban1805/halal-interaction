const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB().then(() => {
  // Initialize Cron Jobs
  const { initCronJobs } = require('./services/cronService');
  initCronJobs();
  
  // Initialize Location Data cache
  const { initLocationData } = require('./services/locationService');
  initLocationData();
}).catch(err => {
  console.error("Database connection failed", err);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routers
app.set('io', io);

// --- TIMEZONE HELPER ---
const getISTBoundaries = (period, startDate, endDate) => {
  let startLimit = null;
  let endLimit = null;
  
  const getISTTime = (date = new Date()) => new Date(date.getTime() + (330 * 60 * 1000));
  const fromISTTime = (istDate) => new Date(istDate.getTime() - (330 * 60 * 1000));

  if (startDate && endDate) {
    const startIST = getISTTime(new Date(startDate));
    startIST.setUTCHours(0, 0, 0, 0);
    startLimit = fromISTTime(startIST);
    
    const endIST = getISTTime(new Date(endDate));
    endIST.setUTCHours(23, 59, 59, 999);
    endLimit = fromISTTime(endIST);
  } else if (period) {
    const nowIST = getISTTime();
    endLimit = new Date(); // default

    if (period === '24h') {
      startLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (period === 'all' || period === 'all_time') {
      startLimit = null;
    } else if (period === 'today') {
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
    } else if (period === 'yesterday') {
      nowIST.setUTCDate(nowIST.getUTCDate() - 1);
      const startYesterday = new Date(nowIST);
      startYesterday.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(startYesterday);
      const endYesterday = new Date(nowIST);
      endYesterday.setUTCHours(23, 59, 59, 999);
      endLimit = fromISTTime(endYesterday);
    } else if (period === 'this_week') {
      const day = nowIST.getUTCDay() || 7; 
      nowIST.setUTCDate(nowIST.getUTCDate() - day + 1);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
    } else if (period === 'last_week') {
      const day = nowIST.getUTCDay() || 7; 
      nowIST.setUTCDate(nowIST.getUTCDate() - day - 6);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
      const endLastWeek = new Date(nowIST);
      endLastWeek.setUTCDate(endLastWeek.getUTCDate() + 6);
      endLastWeek.setUTCHours(23, 59, 59, 999);
      endLimit = fromISTTime(endLastWeek);
    } else if (period === 'this_month') {
      nowIST.setUTCDate(1);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
    } else if (period === 'last_month') {
      nowIST.setUTCMonth(nowIST.getUTCMonth() - 1);
      nowIST.setUTCDate(1);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
      const endLastMonth = new Date(nowIST);
      endLastMonth.setUTCMonth(endLastMonth.getUTCMonth() + 1);
      endLastMonth.setUTCDate(0); 
      endLastMonth.setUTCHours(23, 59, 59, 999);
      endLimit = fromISTTime(endLastMonth);
    } else if (period === 'this_year') {
      nowIST.setUTCMonth(0, 1);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
    } else {
      const daysNum = parseInt(period, 10);
      if (!isNaN(daysNum)) {
        nowIST.setUTCDate(nowIST.getUTCDate() - daysNum + 1);
        nowIST.setUTCHours(0, 0, 0, 0);
        startLimit = fromISTTime(nowIST);
      }
    }
  }
  
  return { startLimit, endLimit };
};

// --- CLIENT-NEW COMPATIBILITY ALIASES ---
// Settings endpoints with real MongoDB persistence
app.get('/api/settings', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const doc = await Setting.findOne({ key: 'global_settings' });
    res.json(doc ? doc.value : {
      autoCommentReply: true, commentReplyText: "",
      autoDMReply: true, dmReplyText: "",
      dmOnComment: false, dmOnCommentText: ""
    });
  } catch(err) { res.json({}); }
});
app.post('/api/settings', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    await Setting.findOneAndUpdate({ key: 'global_settings' }, { value: req.body }, { upsert: true });
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false }); }
});

// Intercept analytics dashboard to provide REAL data in the shape client-new expects
app.get('/api/analytics/dashboard', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const Message = require('./models/Message');
    const AutoReplyRule = require('./models/AutoReplyRule');

    const { period, startDate, endDate, agentId } = req.query;
    const { startLimit, endLimit } = getISTBoundaries(period, startDate, endDate);

    const dateQuery = {};
    if (startLimit && endLimit) {
      dateQuery.createdAt = { $gte: startLimit, $lte: endLimit };
    }
    const leadQuery = { ...dateQuery, isPipelineLead: true, isDeleted: { $ne: true } };
    if (agentId && agentId !== 'all') {
      if (agentId === 'unassigned') {
        leadQuery.assignedTo = null;
      } else if (agentId === 'me') {
        leadQuery.assignedTo = req.user._id;
      } else {
        leadQuery.assignedTo = agentId;
      }
    }

    const distributionQuery = { ...leadQuery, priority: 'hot' };
    
    // Use Outcome logic for Won/Lost to count leads converted in this period, regardless of when they were created
    const wonQuery = { isPipelineLead: true, status: 'Won', priority: 'hot', isDeleted: { $ne: true }, isCancellation: { $ne: true } };
    const lostQuery = { isPipelineLead: true, status: 'Lost', priority: 'hot', isDeleted: { $ne: true } };
    
    if (agentId && agentId !== 'all') {
      wonQuery.assignedTo = leadQuery.assignedTo;
      lostQuery.assignedTo = leadQuery.assignedTo;
    }
    
    if (startLimit && endLimit) {
      wonQuery.statusHistory = { $elemMatch: { status: 'Won', timestamp: { $gte: startLimit, $lte: endLimit } } };
      lostQuery.statusHistory = { $elemMatch: { status: 'Lost', timestamp: { $gte: startLimit, $lte: endLimit } } };
    }

    const Comment = require('./models/Comment');
    const Task = require('./models/Task');

    const [
      totalLeads, hotLeads, wonLeads, lostLeads, futureCityCount,
      assignedLeadsCount, unassignedLeadsCount, newCount, notPickingCount,
      sentWhatsAppCount, callLaterCount, spokenCount, pitchedMembershipCount,
      followingUpCount, paymentPendingCount, onHoldCount, wrongNumberCount,
      eventRegistrationCount, trialMembershipCount,
      dmCount, commentCount, manualCount, incomingDMs, outgoingDMs,
      incomingComments, outgoingComments, totalAutomatedDMs, totalAutomatedComments,
      pendingTasks
    ] = await Promise.all([
      Lead.countDocuments(leadQuery),
      Lead.countDocuments({ ...leadQuery, priority: 'hot' }),
      Lead.countDocuments(wonQuery),
      Lead.countDocuments(lostQuery),
      Lead.countDocuments({ ...distributionQuery, status: 'Future City' }),
      Lead.countDocuments({ ...distributionQuery, status: { $ne: 'Future City' }, $and: [{ assignedTo: { $ne: null } }] }),
      Lead.countDocuments({ ...distributionQuery, status: { $ne: 'Future City' }, $and: [{ assignedTo: null }] }),
      Lead.countDocuments({ ...distributionQuery, status: 'New' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Not Picking' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Sent WhatsApp' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Call Later' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Spoken' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Pitched Membership' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Following Up' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Payment Pending' }),
      Lead.countDocuments({ ...distributionQuery, status: 'On Hold' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Wrong Number' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Event Registration' }),
      Lead.countDocuments({ ...distributionQuery, status: 'Trial Membership' }),
      Lead.countDocuments({ ...leadQuery, source: 'dm' }),
      Lead.countDocuments({ ...leadQuery, source: 'comment' }),
      Lead.countDocuments({ ...leadQuery, source: 'manual' }),
      Message.countDocuments({ ...dateQuery, direction: 'inbound' }),
      Message.countDocuments({ ...dateQuery, direction: 'outbound' }),
      Comment.countDocuments({ ...dateQuery, direction: 'inbound' }),
      Comment.countDocuments({ ...dateQuery, direction: 'outbound' }),
      Message.countDocuments({ ...dateQuery, isAutomated: true }),
      Comment.countDocuments({ ...dateQuery, isAutomated: true }),
      Task.countDocuments({ ...dateQuery, status: 'pending' })
    ]);
    
    const validHotLeads = hotLeads - futureCityCount;
    
    const conversionRate = assignedLeadsCount > 0 ? ((wonLeads / assignedLeadsCount) * 100).toFixed(1) : 0;
    const lostRate = assignedLeadsCount > 0 ? ((lostLeads / assignedLeadsCount) * 100).toFixed(1) : 0;
    
    const wonCount = wonLeads;
    const lostCount = lostLeads;
    const futureCityCountVal = futureCityCount;

    const totalAutomations = totalAutomatedDMs + totalAutomatedComments;

    // Calculate chart data
    const chartData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let chartStart;
    if (startLimit) {
      chartStart = startLimit;
    } else if (period === 'all') {
      const oldestLead = await Lead.findOne().sort({ createdAt: 1 });
      chartStart = oldestLead ? oldestLead.createdAt : new Date(new Date().setDate(new Date().getDate() - 30));
    } else {
      chartStart = new Date(new Date().setDate(new Date().getDate() - 6));
    }
    if (!startLimit && period !== 'all') chartStart.setHours(0,0,0,0);
    const chartEnd = endLimit || new Date();

    if (period === '24h') {
      const [msgsData, commentsData, leadsData] = await Promise.all([
        Message.aggregate([
          { $match: { createdAt: { $gte: chartStart, $lte: chartEnd }, direction: 'inbound' } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } }
        ]),
        Comment.aggregate([
          { $match: { createdAt: { $gte: chartStart, $lte: chartEnd }, direction: 'inbound' } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } }
        ]),
        Lead.aggregate([
          { $match: { isPipelineLead: true, createdAt: { $gte: chartStart, $lte: chartEnd } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } }
        ])
      ]);

      const msgsMap = msgsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});
      const commentsMap = commentsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});
      const leadsMap = leadsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

      for (let i = 23; i >= 0; i--) {
        const d = new Date(chartEnd);
        const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
        istDate.setUTCHours(istDate.getUTCHours() - i);
        
        const label = `${istDate.getUTCHours().toString().padStart(2, '0')}:00`;
        const dateStr = istDate.toISOString().split(':')[0].replace('T', ' ');

        chartData.push({
          day: label,
          fullDate: d.toISOString(),
          messages: msgsMap[dateStr] || 0,
          comments: commentsMap[dateStr] || 0,
          leads: leadsMap[dateStr] || 0
        });
      }
    } else {
      const diffTime = Math.abs(chartEnd - chartStart);
      let daysToIterate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysToIterate === 0) daysToIterate = 1;

      let interval = 'day';
      let formatStr = "%Y-%m-%d";
      
      if (daysToIterate > 730) {
        interval = 'year';
        formatStr = "%Y";
      } else if (daysToIterate > 90) {
        interval = 'month';
        formatStr = "%Y-%m";
      }

      const [msgsData, commentsData, leadsData] = await Promise.all([
        Message.aggregate([
          { $match: { createdAt: { $gte: chartStart, $lte: chartEnd }, direction: 'inbound' } },
          { $group: { _id: { $dateToString: { format: formatStr, date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } }
        ]),
        Comment.aggregate([
          { $match: { createdAt: { $gte: chartStart, $lte: chartEnd }, direction: 'inbound' } },
          { $group: { _id: { $dateToString: { format: formatStr, date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } }
        ]),
        Lead.aggregate([
          { $match: { isPipelineLead: true, createdAt: { $gte: chartStart, $lte: chartEnd } } },
          { $group: { _id: { $dateToString: { format: formatStr, date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } }
        ])
      ]);

      const msgsMap = msgsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});
      const commentsMap = commentsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});
      const leadsMap = leadsData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

      if (interval === 'day') {
        if (daysToIterate > 365) daysToIterate = 365;
        for(let i = daysToIterate - 1; i >= 0; i--) {
          const d = new Date(chartEnd);
          const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
          istDate.setUTCDate(istDate.getUTCDate() - i);
          
          const dateStr = istDate.toISOString().split('T')[0];
          let label = days[istDate.getUTCDay()];
          if (daysToIterate > 14) {
            label = `${istDate.getUTCMonth()+1}/${istDate.getUTCDate()}`;
          }
          
          chartData.push({
            day: label,
            fullDate: dateStr,
            messages: msgsMap[dateStr] || 0,
            comments: commentsMap[dateStr] || 0,
            leads: leadsMap[dateStr] || 0
          });
        }
      } else if (interval === 'month') {
        let monthsToIterate = (chartEnd.getFullYear() - chartStart.getFullYear()) * 12 + (chartEnd.getMonth() - chartStart.getMonth()) + 1;
        for (let i = monthsToIterate - 1; i >= 0; i--) {
          const d = new Date(chartEnd);
          const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
          istDate.setUTCMonth(istDate.getUTCMonth() - i);
          
          const yyyy = istDate.getUTCFullYear();
          const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}`;
          
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const label = `${monthNames[istDate.getUTCMonth()]} ${yyyy}`;
          
          chartData.push({
            day: label,
            fullDate: dateStr,
            messages: msgsMap[dateStr] || 0,
            comments: commentsMap[dateStr] || 0,
            leads: leadsMap[dateStr] || 0
          });
        }
      } else if (interval === 'year') {
        let yearsToIterate = (chartEnd.getFullYear() - chartStart.getFullYear()) + 1;
        for (let i = yearsToIterate - 1; i >= 0; i--) {
          const d = new Date(chartEnd);
          const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
          istDate.setUTCFullYear(istDate.getUTCFullYear() - i);
          
          const yyyy = istDate.getUTCFullYear();
          const dateStr = `${yyyy}`;
          const label = `${yyyy}`;
          
          chartData.push({
            day: label,
            fullDate: dateStr,
            messages: msgsMap[dateStr] || 0,
            comments: commentsMap[dateStr] || 0,
            leads: leadsMap[dateStr] || 0
          });
        }
      }
    }
    
    res.json({
      leads: { 
        total: totalLeads, 
        hot: validHotLeads, 
        assigned: assignedLeadsCount,
        unassigned: unassignedLeadsCount,
        futureCity: futureCityCount,
        conversionRate,
        lostRate,
        distribution: { new: newCount, notPicking: notPickingCount, sentWhatsApp: sentWhatsAppCount, callLater: callLaterCount, spoken: spokenCount, pitchedMembership: pitchedMembershipCount, followingUp: followingUpCount, paymentPending: paymentPendingCount, won: wonCount, lost: lostCount, onHold: onHoldCount, futureCity: futureCityCount, wrongNumber: wrongNumberCount, eventRegistration: eventRegistrationCount, trialMembership: trialMembershipCount },
        sources: { dm: dmCount, comment: commentCount, manual: manualCount } 
      },
      tasks: { pending: pendingTasks },
      social: { incomingDMs: incomingDMs, outgoingDMs: outgoingDMs, totalComments: incomingComments + outgoingComments, totalAutomations: totalAutomations },
      chartData: chartData,
      recentLogs: []
    });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Revenue Analytics Endpoint
app.get('/api/analytics/revenue', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const MembershipTransaction = require('./models/MembershipTransaction');
    const EventTransaction = require('./models/EventTransaction');
    const User = require('./models/User');
    
    const excludedEmails = ['superadmin@gmail.com', 'admin@gmail.com', 'agent@gmail.com'];
    const excludedUsersDocs = await User.find({ email: { $in: excludedEmails } }).select('_id');
    const excludedUserIds = excludedUsersDocs.map(u => u._id);

    const { period, startDate, endDate } = req.query;
    const { startLimit, endLimit } = getISTBoundaries(period, startDate, endDate);

    const paidStatuses = ['Won'];
    
    let activeLeadIds = [];
    if (startLimit && endLimit) {
      const memTxs = await MembershipTransaction.find({ transactionDate: { $gte: startLimit, $lte: endLimit } }).select('leadId');
      const evTxs = await EventTransaction.find({ transactionDate: { $gte: startLimit, $lte: endLimit } }).select('leadId');
      activeLeadIds = [...memTxs.map(tx => tx.leadId), ...evTxs.map(tx => tx.leadId)];
    }

    const matchQuery = { 
      isPipelineLead: true,
      $or: [
        { status: { $in: paidStatuses } },
        { "statusHistory.status": { $in: paidStatuses } }
      ]
    };
    
    if (startLimit && endLimit) {
      matchQuery.$or = [
        { _id: { $in: activeLeadIds } },
        { statusHistory: { $elemMatch: { status: { $in: paidStatuses }, timestamp: { $gte: startLimit, $lte: endLimit } } } },
        { 
          $and: [
            { $or: [ { statusHistory: { $exists: false } }, { statusHistory: { $size: 0 } }, { "statusHistory.status": { $nin: paidStatuses } } ] },
            { createdAt: { $gte: startLimit, $lte: endLimit } }
          ]
        }
      ];
    }

    const basePipeline = [
      { $match: matchQuery },
      {
        $addFields: {
          wonDate: {
            $let: {
              vars: {
                wonRecord: {
                  $arrayElemAt: [
                    { $filter: { input: { $ifNull: ["$statusHistory", []] }, as: "hist", cond: { $in: ["$$hist.status", ['Won']] } } },
                    -1
                  ]
                }
              },
              in: { $ifNull: ["$$wonRecord.timestamp", "$createdAt"] }
            }
          }
        }
      },
      {
        $addFields: {
          isWonDateInPeriod: startLimit && endLimit ? {
            $and: [
              { $gte: ["$wonDate", new Date(startLimit)] },
              { $lte: ["$wonDate", new Date(endLimit)] }
            ]
          } : true
        }
      },
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
          unfilteredMemTxCount: { $size: "$memTx" },
          eventTx: {
            $filter: {
              input: "$eventTx",
              as: "tx",
              cond: {
                $and: [
                  ...(startLimit && endLimit ? [{ $gte: ["$$tx.transactionDate", new Date(startLimit)] }, { $lte: ["$$tx.transactionDate", new Date(endLimit)] }] : []),
                  { $not: { $in: [{ $ifNull: ["$$tx.createdBy", "$assignedTo"] }, excludedUserIds] } }
                ]
              }
            }
          },
          memTx: {
            $filter: {
              input: "$memTx",
              as: "tx",
              cond: {
                $and: [
                  ...(startLimit && endLimit ? [{ $gte: ["$$tx.transactionDate", new Date(startLimit)] }, { $lte: ["$$tx.transactionDate", new Date(endLimit)] }] : []),
                  { $not: { $in: [{ $ifNull: ["$$tx.createdBy", "$assignedTo"] }, excludedUserIds] } }
                ]
              }
            }
          }
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
              { $cond: [
                  { $and: [
                    "$isWonDateInPeriod",
                    { $ne: ["$isRenewal", true] },
                    { $in: ["$status", ["Won"]] },
                    { $not: { $in: ["$assignedTo", excludedUserIds] } }
                  ]}, 
                  { $ifNull: ["$amountPaid", 0] }, 
                  0
                ] 
              }
            ]
          },
          finalRenewalRevenueInclusive: {
            $cond: [
              "$hasMemTx",
              "$memRenewalRevenue",
              { $cond: [
                  { $and: [
                    "$isWonDateInPeriod",
                    { $eq: ["$isRenewal", true] },
                    { $in: ["$status", ["Won"]] },
                    { $not: { $in: ["$assignedTo", excludedUserIds] } }
                  ]}, 
                  { $ifNull: ["$amountPaid", 0] }, 
                  0
                ] 
              }
            ]
          },
          finalNewRevenueExclusive: {
            $cond: [
              "$hasMemTx",
              { $divide: ["$memNewRevenue", 1.18] },
              { $cond: [
                  { $and: [
                    "$isWonDateInPeriod",
                    { $ne: ["$isRenewal", true] },
                    { $in: ["$status", ["Won"]] },
                    { $not: { $in: ["$assignedTo", excludedUserIds] } }
                  ]}, 
                  { $ifNull: ["$amountPaidExclusive", 0] }, 
                  0
                ] 
              }
            ]
          },
          finalRenewalRevenueExclusive: {
            $cond: [
              "$hasMemTx",
              { $divide: ["$memRenewalRevenue", 1.18] },
              { $cond: [
                  { $and: [
                    "$isWonDateInPeriod",
                    { $eq: ["$isRenewal", true] },
                    { $in: ["$status", ["Won"]] },
                    { $not: { $in: ["$assignedTo", excludedUserIds] } }
                  ]}, 
                  { $ifNull: ["$amountPaidExclusive", 0] }, 
                  0
                ] 
              }
            ]
          },
          computedDate: {
            $cond: [
              { $gt: [{ $size: "$eventTx" }, 0] },
              { $arrayElemAt: ["$eventTx.transactionDate", 0] },
              { $cond: [
                  { $gt: [{ $size: "$memTx" }, 0] },
                  { $arrayElemAt: ["$memTx.transactionDate", 0] },
                  "$wonDate"
                ]
              }
            ]
          }
        }
      }
    ];

    // Remove the final $match: { wonDate: ... } because we now rely on transaction filtering and fallback flags!


    const aggData = await Lead.aggregate([
      ...basePipeline,
      {
        $project: {
          assignedTo: 1,
          status: 1,
          isDeleted: 1,
          isWonDateInPeriod: 1,
          isRenewal: 1,
          amountPaid: 1,
          eventTx: 1,
          memTx: 1,
          unfilteredMemTxCount: 1,
          createdAt: 1,
          priority: 1,
          isCancellation: 1
        }
      }
    ]);

    const aggMap = {};
    
    // Initialize aggMap with empty objects for easier accumulation
    const getStatsObj = (id) => {
      const key = id ? id.toString() : 'unassigned';
      if (!aggMap[key]) {
        aggMap[key] = {
          membershipRevenueInclusive: 0,
          renewalRevenueInclusive: 0,
          eventRevenueInclusive: 0,
          dealsWon: 0,
          newMemberships: 0,
          renewals: 0,
          upgrades: 0,
          events: 0
        };
      }
      return aggMap[key];
    };

    aggData.forEach(lead => {
      const leadAgent = lead.assignedTo ? lead.assignedTo.toString() : 'unassigned';
      
      // Deals Won (based on transaction date - aligned with Transaction History)
      const hasTransactionInPeriod = (lead.memTx && lead.memTx.length > 0) || (lead.eventTx && lead.eventTx.length > 0);
      const isLegacyWon = lead.unfilteredMemTxCount === 0 && lead.isWonDateInPeriod;
      if (!lead.isDeleted && !lead.isCancellation && ['Won', 'Event Registration'].includes(lead.status) && (hasTransactionInPeriod || isLegacyWon)) {
        getStatsObj(leadAgent).dealsWon += 1;
      }

      // Event Transactions
      if (lead.eventTx && lead.eventTx.length > 0) {
        lead.eventTx.forEach(tx => {
          const creditedAgent = tx.createdBy ? tx.createdBy.toString() : leadAgent;
          getStatsObj(creditedAgent).eventRevenueInclusive += (tx.amountPaid || 0);
          getStatsObj(creditedAgent).events += 1;
        });
      }

      // Membership Transactions & Legacy Fallback
      if (lead.memTx && lead.memTx.length > 0) {
        lead.memTx.forEach(tx => {
          const creditedAgent = tx.createdBy ? tx.createdBy.toString() : leadAgent;
          if (tx.isRenewal) {
            getStatsObj(creditedAgent).renewalRevenueInclusive += (tx.amountPaid || 0);
            getStatsObj(creditedAgent).renewals += 1;
          } else if (tx.isUpgrade) {
            getStatsObj(creditedAgent).membershipRevenueInclusive += (tx.amountPaid || 0);
            getStatsObj(creditedAgent).upgrades += 1;
          } else {
            getStatsObj(creditedAgent).membershipRevenueInclusive += (tx.amountPaid || 0);
            getStatsObj(creditedAgent).newMemberships += 1;
          }
        });
      } else {
        // Legacy Fallback
        if (lead.unfilteredMemTxCount === 0 && !lead.isDeleted && lead.isWonDateInPeriod && ['Won'].includes(lead.status)) {
          if (lead.isRenewal) {
            getStatsObj(leadAgent).renewalRevenueInclusive += (lead.amountPaid || 0);
            getStatsObj(leadAgent).renewals += 1;
          } else {
            getStatsObj(leadAgent).membershipRevenueInclusive += (lead.amountPaid || 0);
            getStatsObj(leadAgent).newMemberships += 1;
          }
        }
      }
    });

    Object.keys(aggMap).forEach(key => {
      const stats = aggMap[key];
      stats.membershipRevenueExclusive = stats.membershipRevenueInclusive / 1.18;
      stats.renewalRevenueExclusive = stats.renewalRevenueInclusive / 1.18;
      stats.eventRevenueExclusive = stats.eventRevenueInclusive / 1.18;
      stats.totalInclusive = stats.membershipRevenueInclusive + stats.renewalRevenueInclusive + stats.eventRevenueInclusive;
      stats.totalExclusive = stats.membershipRevenueExclusive + stats.renewalRevenueExclusive + stats.eventRevenueExclusive;
    });

    const users = await User.find({ _id: { $nin: excludedUserIds } }).select('name role email');
    const revenueData = users.map(u => {
      const stats = aggMap[u._id.toString()] || { 
        totalInclusive: 0, totalExclusive: 0, 
        membershipRevenueInclusive: 0, membershipRevenueExclusive: 0,
        renewalRevenueInclusive: 0, renewalRevenueExclusive: 0,
        eventRevenueInclusive: 0, eventRevenueExclusive: 0,
        dealsWon: 0, newMemberships: 0, renewals: 0, upgrades: 0, events: 0
      };
      return {
        agentId: u._id,
        agentName: u.name,
        totalInclusive: stats.totalInclusive,
        totalExclusive: stats.totalExclusive,
        membershipRevenueInclusive: stats.membershipRevenueInclusive,
        membershipRevenueExclusive: stats.membershipRevenueExclusive,
        renewalRevenueInclusive: stats.renewalRevenueInclusive,
        renewalRevenueExclusive: stats.renewalRevenueExclusive,
        eventRevenueInclusive: stats.eventRevenueInclusive,
        eventRevenueExclusive: stats.eventRevenueExclusive,
        dealsWon: stats.dealsWon,
        newMemberships: stats.newMemberships,
        renewals: stats.renewals,
        upgrades: stats.upgrades,
        events: stats.events
      };
    });

    if (req.user && ['admin', 'superadmin'].includes(req.user.role) && aggMap['unassigned']) {
      const stats = aggMap['unassigned'];
      revenueData.push({
        agentId: null,
        agentName: 'Unassigned',
        totalInclusive: stats.totalInclusive,
        totalExclusive: stats.totalExclusive,
        membershipRevenueInclusive: stats.membershipRevenueInclusive,
        membershipRevenueExclusive: stats.membershipRevenueExclusive,
        renewalRevenueInclusive: stats.renewalRevenueInclusive,
        renewalRevenueExclusive: stats.renewalRevenueExclusive,
        eventRevenueInclusive: stats.eventRevenueInclusive,
        eventRevenueExclusive: stats.eventRevenueExclusive,
        dealsWon: stats.dealsWon,
        newMemberships: stats.newMemberships,
        renewals: stats.renewals,
        upgrades: stats.upgrades,
        events: stats.events
      });
    }

    revenueData.sort((a, b) => b.totalInclusive - a.totalInclusive);

    let totalRevenueInclusive = 0;
    let totalRevenueExclusive = 0;
    let membershipRevenueInclusive = 0;
    let membershipRevenueExclusive = 0;
    let renewalRevenueInclusive = 0;
    let renewalRevenueExclusive = 0;
    let eventRevenueInclusive = 0;
    let eventRevenueExclusive = 0;
    
    revenueData.forEach(r => {
      if (req.user && !['admin', 'superadmin'].includes(req.user.role) && r.agentId && r.agentId.toString() !== req.user._id.toString()) {
        return;
      }
      totalRevenueInclusive += r.totalInclusive || 0;
      totalRevenueExclusive += r.totalExclusive || 0;
      membershipRevenueInclusive += r.membershipRevenueInclusive || 0;
      membershipRevenueExclusive += r.membershipRevenueExclusive || 0;
      renewalRevenueInclusive += r.renewalRevenueInclusive || 0;
      renewalRevenueExclusive += r.renewalRevenueExclusive || 0;
      eventRevenueInclusive += r.eventRevenueInclusive || 0;
      eventRevenueExclusive += r.eventRevenueExclusive || 0;
    });

    const chartPipeline = [...basePipeline];
    if (req.user && !['admin', 'superadmin'].includes(req.user.role)) {
      chartPipeline.push({ $match: { assignedTo: req.user._id } });
    }

    // Calculate chart data for revenue
    const chartData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let chartStart;
    if (startLimit) {
      chartStart = startLimit;
    } else if (period === 'all' || period === 'all_time') {
      const oldestLead = await Lead.findOne({ status: 'Won', isPipelineLead: true }).sort({ createdAt: 1 });
      chartStart = oldestLead ? oldestLead.createdAt : new Date(new Date().setDate(new Date().getDate() - 30));
    } else {
      chartStart = new Date(new Date().setDate(new Date().getDate() - 6));
    }
    if (!startLimit && period !== 'all' && period !== 'all_time') chartStart.setHours(0,0,0,0);
    const chartEnd = endLimit || new Date();

    if (period === '24h') {
      const revData = await Lead.aggregate([
        ...chartPipeline,
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H", date: "$computedDate", timezone: "Asia/Kolkata" } }, amount: { $sum: { $add: ["$finalNewRevenueInclusive", "$finalRenewalRevenueInclusive", "$totalEventRevenue"] } } } }
      ]);
      const revMap = revData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.amount }), {});
      for (let i = 23; i >= 0; i--) {
        const d = new Date(chartEnd);
        const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
        istDate.setUTCHours(istDate.getUTCHours() - i);
        const label = `${istDate.getUTCHours().toString().padStart(2, '0')}:00`;
        const dateStr = istDate.toISOString().split(':')[0].replace('T', ' ');
        chartData.push({ day: label, fullDate: d.toISOString(), revenue: revMap[dateStr] || 0 });
      }
    } else {
      const diffTime = Math.abs(chartEnd - chartStart);
      let daysToIterate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysToIterate === 0) daysToIterate = 1;

      let interval = 'day';
      let formatStr = "%Y-%m-%d";
      
      if (daysToIterate > 730) {
        interval = 'year';
        formatStr = "%Y";
      } else if (daysToIterate > 90) {
        interval = 'month';
        formatStr = "%Y-%m";
      }

      const revData = await Lead.aggregate([
        ...chartPipeline,
        { $group: { _id: { $dateToString: { format: formatStr, date: "$computedDate", timezone: "Asia/Kolkata" } }, amount: { $sum: { $add: ["$finalNewRevenueInclusive", "$finalRenewalRevenueInclusive", "$totalEventRevenue"] } } } }
      ]);
      const revMap = revData.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.amount }), {});

      if (interval === 'day') {
        if (daysToIterate > 365) daysToIterate = 365;
        for(let i = daysToIterate - 1; i >= 0; i--) {
          const d = new Date(chartEnd);
          const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
          istDate.setUTCDate(istDate.getUTCDate() - i);
          
          const dateStr = istDate.toISOString().split('T')[0];
          let label = days[istDate.getUTCDay()];
          if (daysToIterate > 14) {
            label = `${istDate.getUTCMonth()+1}/${istDate.getUTCDate()}`;
          }
          
          chartData.push({ day: label, fullDate: dateStr, revenue: revMap[dateStr] || 0 });
        }
      } else if (interval === 'month') {
        let monthsToIterate = (chartEnd.getFullYear() - chartStart.getFullYear()) * 12 + (chartEnd.getMonth() - chartStart.getMonth()) + 1;
        for (let i = monthsToIterate - 1; i >= 0; i--) {
          const d = new Date(chartEnd);
          const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
          istDate.setUTCMonth(istDate.getUTCMonth() - i);
          
          const yyyy = istDate.getUTCFullYear();
          const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}`;
          
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const label = `${monthNames[istDate.getUTCMonth()]} ${yyyy}`;
          
          chartData.push({ day: label, fullDate: dateStr, revenue: revMap[dateStr] || 0 });
        }
      } else if (interval === 'year') {
        let yearsToIterate = (chartEnd.getFullYear() - chartStart.getFullYear()) + 1;
        for (let i = yearsToIterate - 1; i >= 0; i--) {
          const d = new Date(chartEnd);
          const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
          istDate.setUTCFullYear(istDate.getUTCFullYear() - i);
          
          const yyyy = istDate.getUTCFullYear();
          const dateStr = `${yyyy}`;
          const label = `${yyyy}`;
          
          chartData.push({ day: label, fullDate: dateStr, revenue: revMap[dateStr] || 0 });
        }
      }
    }

    // Calculate Financial Summary (Profit & Loss)
    let totalEventExpenses = 0;
    const EventExpense = require('./models/EventExpense');
    if (startLimit && endLimit) {
      const expenses = await EventExpense.find({ date: { $gte: startLimit, $lte: endLimit } });
      totalEventExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    } else {
      const expenses = await EventExpense.find();
      totalEventExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    }

    let monthsMultiplier = 1;
    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      monthsMultiplier = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
    } else {
      monthsMultiplier = 1; // Fallback for all time
    }

    const SalaryConfig = require('./models/SalaryConfig');
    const configs = await SalaryConfig.find();
    
    const Team = require('./models/Team');
    const teams = await Team.find().populate('members', 'name email role');

    const userDocs = await User.find().select('designation');
    const userRoleMap = {};
    userDocs.forEach(u => userRoleMap[u._id.toString()] = u.designation);

    const computeIncentive = (config, revenue) => {
      if (!config || !config.incentives || config.incentives.length === 0 || revenue <= 0) return 0;
      let totalIncentive = 0;
      const slabs = [...config.incentives].sort((a, b) => a.minRevenue - b.minRevenue);
      for (const slab of slabs) {
        if (revenue <= slab.minRevenue) break;
        const slabUpperLimit = (slab.maxRevenue !== null && slab.maxRevenue !== undefined) ? slab.maxRevenue : Infinity;
        const applicableRevenueInSlab = Math.min(revenue, slabUpperLimit) - slab.minRevenue;
        if (applicableRevenueInSlab > 0) {
          totalIncentive += applicableRevenueInSlab * (slab.rewardPercentage / 100);
        }
      }
      return totalIncentive;
    };

    let totalSalaries = 0;
    let totalIncentives = 0;

    revenueData.forEach(agent => {
      if (!agent.agentId) return;
      const agentIdStr = agent.agentId.toString();

      const config = configs.find(c => c.agentId.toString() === agentIdStr);
      if (config) {
        const base = config.baseSalary || 0;
        totalSalaries += (base * monthsMultiplier);

        const designation = userRoleMap[agentIdStr];
        let teamMembers = [];
        if (designation === 'Manager' || designation === 'Mentor') {
           const myTeam = teams.find(t => t.lead && t.lead.toString() === agentIdStr);
           if (myTeam) teamMembers = myTeam.members;
        }

        const agentRev = agent.totalExclusive || 0; 
        const agentRen = agent.renewalRevenueExclusive || 0;
        let applicablePersonalRevenue = agentRev;
        let renewalBonusAmt = 0;

        if (config.managerRenewalPercentage && config.managerRenewalPercentage > 0) {
           applicablePersonalRevenue = Math.max(0, agentRev - agentRen);
           let totalRenewalRevenue = agentRen;
           teamMembers.forEach(member => {
              const memberData = revenueData.find(r => r.agentId && r.agentId.toString() === member._id.toString());
              if (memberData) totalRenewalRevenue += (memberData.renewalRevenueExclusive || 0);
           });
           renewalBonusAmt = (totalRenewalRevenue * config.managerRenewalPercentage) / 100;
        }

        const personalIncentive = computeIncentive(config, applicablePersonalRevenue) + renewalBonusAmt;
        
        let teamIncentive = 0;
        if (designation === 'Manager') {
           let totalTeamRevenue = agentRev;
           teamMembers.forEach(member => {
              const memberData = revenueData.find(r => r.agentId && r.agentId.toString() === member._id.toString());
              if (memberData) totalTeamRevenue += (memberData.totalExclusive || 0);
           });
           
           if (totalTeamRevenue >= (config.managerTeamTarget || 0) && (config.managerTeamTarget || 0) > 0) {
              if (config.managerRewardType === 'percentage') {
                 const extraRevenue = totalTeamRevenue - (config.managerTeamTarget || 0);
                 if (extraRevenue > 0) {
                   teamIncentive += (extraRevenue * (config.managerIncentive || 0)) / 100;
                 }
              } else {
                 teamIncentive += config.managerIncentive || 0;
              }
           }
        }

        if (designation === 'Mentor' && config.teamTargets && config.teamTargets.length > 0) {
           config.teamTargets.forEach(tt => {
              const memberData = revenueData.find(r => r.agentId && r.agentId.toString() === tt.memberId.toString());
              const memberRev = memberData ? (memberData.totalExclusive || 0) : 0;
              if (memberRev >= tt.targetRevenue && tt.targetRevenue > 0) {
                 teamIncentive += tt.mentorIncentive || 0;
              }
           });
        }

        totalIncentives += (personalIncentive + teamIncentive);
      }
    });

    const totalIncome = totalRevenueInclusive;
    const totalExpenses = totalEventExpenses + totalSalaries + totalIncentives;
    const netProfit = totalIncome - totalExpenses;

    const MembershipTier = require('./models/MembershipTier');
    
    // Calculate Tier-wise Revenue (Exclusive)
    let tierRevenueMap = {};
    const memTxQuery = { isCancellation: { $ne: true } };
    if (startLimit && endLimit) {
      memTxQuery.transactionDate = { $gte: startLimit, $lte: endLimit };
    }
    const memTxs = await MembershipTransaction.find(memTxQuery)
      .populate('tierId', 'name')
      .populate('leadId', 'assignedTo');
      
    const excludedIdsStr = excludedUserIds.map(id => id.toString());
    
    memTxs.forEach(tx => {
      if (!tx.tierId) return;
      
      const createdByStr = tx.createdBy ? tx.createdBy.toString() : null;
      const assignedToStr = (tx.leadId && tx.leadId.assignedTo) ? tx.leadId.assignedTo.toString() : null;
      const ownerId = createdByStr || assignedToStr;
      
      if (ownerId && excludedIdsStr.includes(ownerId)) {
        return; // Exclude admin transactions to match dashboard top cards
      }

      const tierName = tx.tierId.name;
      const amountExc = (tx.amountPaid || 0) / 1.18;
      
      if (!tierRevenueMap[tierName]) {
        tierRevenueMap[tierName] = { value: 0, newLeads: new Set(), renewalLeads: new Set() };
      }
      tierRevenueMap[tierName].value += amountExc;
      if (tx.leadId) {
        if (tx.isRenewal) {
          tierRevenueMap[tierName].renewalLeads.add(tx.leadId._id.toString());
        } else {
          tierRevenueMap[tierName].newLeads.add(tx.leadId._id.toString());
        }
      }
    });

    const tierRevenueData = Object.keys(tierRevenueMap).map(key => ({
      name: key,
      value: tierRevenueMap[key].value,
      newCount: tierRevenueMap[key].newLeads.size,
      renewalCount: tierRevenueMap[key].renewalLeads.size
    })).sort((a,b) => b.value - a.value);

    res.json({
      success: true,
      totalRevenueInclusive,
      totalRevenueExclusive,
      membershipRevenueInclusive,
      membershipRevenueExclusive,
      renewalRevenueInclusive,
      renewalRevenueExclusive,
      eventRevenueInclusive,
      eventRevenueExclusive,
      revenueByAgent: revenueData,
      tierRevenueData,
      chartData,
      financialSummary: {
        totalIncome,
        totalExpenses,
        eventExpenses: totalEventExpenses,
        totalSalaries,
        totalIncentives,
        netProfit
      }
    });

  } catch(err) {
    console.error('Revenue analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// Agent Detailed Revenue Transactions Endpoint
app.get('/api/analytics/revenue/agent/:agentId', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const MembershipTransaction = require('./models/MembershipTransaction');
    const EventTransaction = require('./models/EventTransaction');
    const mongoose = require('mongoose');
    const { period, startDate, endDate } = req.query;
    const { agentId } = req.params;
    const { startLimit, endLimit } = getISTBoundaries(period, startDate, endDate);

    const paidStatuses = ['Won', 'Event Registration', 'Trial Membership'];

    let activeLeadIds = [];
    if (startLimit && endLimit) {
      const memTxs = await MembershipTransaction.find({ transactionDate: { $gte: startLimit, $lte: endLimit } }).select('leadId');
      const evTxs = await EventTransaction.find({ transactionDate: { $gte: startLimit, $lte: endLimit } }).select('leadId');
      activeLeadIds = [...memTxs.map(tx => tx.leadId), ...evTxs.map(tx => tx.leadId)];
    }
    
    const matchQuery = { 
      isPipelineLead: true,
      $or: [
        { status: { $in: paidStatuses } },
        { "statusHistory.status": { $in: paidStatuses } }
      ]
    };
    
    if (startLimit && endLimit) {
      matchQuery.$or = [
        { _id: { $in: activeLeadIds } },
        { statusHistory: { $elemMatch: { status: { $in: paidStatuses }, timestamp: { $gte: startLimit, $lte: endLimit } } } },
        { 
          $and: [
            { $or: [ { statusHistory: { $exists: false } }, { statusHistory: { $size: 0 } }, { "statusHistory.status": { $nin: paidStatuses } } ] },
            { createdAt: { $gte: startLimit, $lte: endLimit } }
          ]
        }
      ];
    }

    let baseMatch = { ...matchQuery };
    if (agentId === 'unassigned') {
      baseMatch.assignedTo = null;
    } else {
      const agentObjectId = new mongoose.Types.ObjectId(agentId);
      const memAgentTxs = await MembershipTransaction.find({ createdBy: agentObjectId }).select('leadId');
      const evAgentTxs = await EventTransaction.find({ createdBy: agentObjectId }).select('leadId');
      const agentTxLeadIds = [...memAgentTxs.map(tx => tx.leadId), ...evAgentTxs.map(tx => tx.leadId)];

      baseMatch = {
        $and: [
          baseMatch,
          {
            $or: [
              { assignedTo: agentObjectId },
              { _id: { $in: agentTxLeadIds } }
            ]
          }
        ]
      };
    }

    const aggData = await Lead.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          wonDate: {
            $let: {
              vars: {
                wonRecord: {
                  $arrayElemAt: [
                    { $filter: { input: { $ifNull: ["$statusHistory", []] }, as: "hist", cond: { $in: ["$$hist.status", ['Won', 'Event Registration', 'Trial Membership']] } } },
                    -1
                  ]
                }
              },
              in: { $ifNull: ["$$wonRecord.timestamp", "$createdAt"] }
            }
          }
        }
      },
      {
        $addFields: {
          isWonDateInPeriod: startLimit && endLimit ? {
            $and: [
              { $gte: ["$wonDate", new Date(startLimit)] },
              { $lte: ["$wonDate", new Date(endLimit)] }
            ]
          } : true
        }
      },
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
          eventTx: startLimit && endLimit ? {
            $filter: {
              input: "$eventTx",
              as: "tx",
              cond: { $and: [ { $gte: ["$$tx.transactionDate", new Date(startLimit)] }, { $lte: ["$$tx.transactionDate", new Date(endLimit)] } ] }
            }
          } : "$eventTx",
          memTx: {
            $filter: {
              input: "$memTx",
              as: "tx",
              cond: {
                $and: [
                  ...(startLimit && endLimit ? [{ $gte: ["$$tx.transactionDate", new Date(startLimit)] }, { $lte: ["$$tx.transactionDate", new Date(endLimit)] }] : [])
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          username: 1,
          status: 1,
          eventTx: 1,
          memTx: 1,
          amountPaid: 1,
          wonDate: 1,
          isWonDateInPeriod: 1,
          assignedTo: 1,
          unfilteredMemTxCount: 1
        }
      }
    ]);

    let transactions = [];

    aggData.forEach(lead => {
      const leadAgent = lead.assignedTo ? lead.assignedTo.toString() : 'unassigned';

      // 1. Process Event Transactions
      if (lead.eventTx && lead.eventTx.length > 0) {
        lead.eventTx.forEach(tx => {
          const creditedAgent = tx.createdBy ? tx.createdBy.toString() : leadAgent;
          if (creditedAgent === agentId) {
            transactions.push({
              id: tx._id,
              leadId: lead._id,
              leadName: lead.name,
              leadUsername: lead.username,
              type: 'Event Registration',
              amount: tx.amountPaid || 0,
              date: tx.transactionDate || lead.wonDate,
              status: lead.status
            });
          }
        });
      }

      // 2. Process Membership Transactions
      let hasMemTx = false;
      if (lead.memTx && lead.memTx.length > 0) {
        hasMemTx = true;
        lead.memTx.forEach(tx => {
          const creditedAgent = tx.createdBy ? tx.createdBy.toString() : leadAgent;
          if (creditedAgent === agentId) {
            transactions.push({
              id: tx._id,
              leadId: lead._id,
              leadName: lead.name,
              leadUsername: lead.username,
              type: tx.isCancellation ? 'Cancellation' : (tx.isRenewal ? 'Membership Renewal' : (tx.isUpgrade ? 'Membership Upgrade' : (tx.isDowngrade ? 'Membership Downgrade' : 'New Membership'))),
              amount: tx.amountPaid || 0,
              date: tx.transactionDate || lead.wonDate,
              status: lead.status
            });
          }
        });
      }

      // 3. Process Fallback Revenue (Legacy)
      if (lead.unfilteredMemTxCount === 0 && !lead.isDeleted && !hasMemTx && ['Won'].includes(lead.status) && lead.amountPaid > 0 && lead.isWonDateInPeriod) {
        if (leadAgent === agentId) {
          transactions.push({
            id: `legacy-${lead._id}`,
            leadId: lead._id,
            leadName: lead.name,
            leadUsername: lead.username,
            type: 'Legacy Membership',
            amount: lead.amountPaid,
            date: lead.wonDate,
            status: lead.status
          });
        }
      }
    });

    // Sort transactions by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, transactions });
  } catch(err) {
    console.error('Agent Revenue transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch agent transactions' });
  }
});

// Leaderboard endpoint: agent performance ranking
app.get('/api/analytics/leaderboard', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const User = require('./models/User');

    const { period, startDate, endDate } = req.query;
    const { startLimit, endLimit } = getISTBoundaries(period, startDate, endDate);

    const dateQuery = {};
    if (startLimit && endLimit) {
      dateQuery.createdAt = { $gte: startLimit, $lte: endLimit };
    }

    const agents = await User.find().select('name email role');
    
    const agentPromises = agents.map(async (agent) => {
      // 1. Assigned during period (Cohort)
      const baseQuery = { ...dateQuery, isPipelineLead: true, assignedTo: agent._id };
      
      // 2. Converted during period (Outcome)
      const wonQuery = { isPipelineLead: true, assignedTo: agent._id, status: 'Won', priority: 'hot', isDeleted: { $ne: true }, isCancellation: { $ne: true } };
      const lostQuery = { isPipelineLead: true, assignedTo: agent._id, status: 'Lost', priority: 'hot', isDeleted: { $ne: true } };
      const pitchedQuery = { isPipelineLead: true, assignedTo: agent._id };
      
      if (startLimit && endLimit) {
        wonQuery.statusHistory = { $elemMatch: { status: 'Won', timestamp: { $gte: startLimit, $lte: endLimit } } };
        lostQuery.statusHistory = { $elemMatch: { status: 'Lost', timestamp: { $gte: startLimit, $lte: endLimit } } };
        pitchedQuery.statusHistory = { $elemMatch: { status: 'Pitched Membership', timestamp: { $gte: startLimit, $lte: endLimit } } };
      } else {
        pitchedQuery.$or = [
          { status: 'Pitched Membership' },
          { 'statusHistory.status': 'Pitched Membership' }
        ];
      }
      
      const [total, won, lost, pitched] = await Promise.all([
        Lead.countDocuments(baseQuery),
        Lead.countDocuments(wonQuery),
        Lead.countDocuments(lostQuery),
        Lead.countDocuments(pitchedQuery)
      ]);

      return {
        _id: agent._id,
        name: agent.name,
        role: agent.role,
        total,
        won,
        lost,
        pitched
      };
    });

    const leaderboard = await Promise.all(agentPromises);

    // Sort by won leads descending, then by total descending
    leaderboard.sort((a, b) => b.won - a.won || b.total - a.total);

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Transaction History Feed Endpoint
app.get('/api/analytics/transactions', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const MembershipTransaction = require('./models/MembershipTransaction');
    const EventTransaction = require('./models/EventTransaction');
    const Lead = require('./models/Lead');
    const User = require('./models/User');

    const { period, startDate, endDate } = req.query;
    let startLimit = null, endLimit = null;
    if (period || (startDate && endDate)) {
      const bounds = getISTBoundaries(period, startDate, endDate);
      startLimit = bounds.startLimit;
      endLimit = bounds.endLimit;
    }

    let matchQuery = {};
    if (startLimit && endLimit) {
      matchQuery.transactionDate = { $gte: startLimit, $lte: endLimit };
    }

    // Fetch all membership transactions with lead and agent populated
    const [memTxs, evTxs, users] = await Promise.all([
      MembershipTransaction.find(matchQuery)
        .populate('leadId', 'name username phone assignedTo')
        .populate('createdBy', 'name')
        .populate('tierId', 'name')
        .sort({ transactionDate: -1 })
        .lean(),
      EventTransaction.find(matchQuery)
        .populate('leadId', 'name username phone assignedTo')
        .populate('createdBy', 'name')
        .populate('eventId', 'name')
        .populate('activityId', 'name')
        .sort({ transactionDate: -1 })
        .lean(),
      User.find().select('name').lean()
    ]);

    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.name; });

    const transactions = [];

    // Process Membership Transactions
    memTxs.forEach(tx => {
      if (!tx.leadId) return;
      const agentName = tx.createdBy
        ? tx.createdBy.name
        : (tx.leadId.assignedTo ? (userMap[tx.leadId.assignedTo.toString()] || 'Unassigned') : 'Unassigned');
      transactions.push({
        id: tx._id,
        leadId: tx.leadId._id,
        leadName: tx.leadId.name || 'Unknown',
        leadUsername: tx.leadId.username || '',
        leadPhone: tx.leadId.phone || '',
        type: tx.isCancellation ? 'Cancellation' : (tx.isRenewal ? 'Membership Renewal' : (tx.isUpgrade ? 'Membership Upgrade' : (tx.isDowngrade ? 'Membership Downgrade' : 'New Membership'))),
        amount: tx.amountPaid || 0,
        date: tx.transactionDate,
        agentName,
        tierName: tx.tierId ? tx.tierId.name : '',
        offerApplied: tx.offerApplied || false,
        discountPercentage: tx.discountPercentage || 0
      });
    });

    // Process Event Transactions
    evTxs.forEach(tx => {
      if (!tx.leadId) return;
      const agentName = tx.createdBy
        ? tx.createdBy.name
        : (tx.leadId.assignedTo ? (userMap[tx.leadId.assignedTo.toString()] || 'Unassigned') : 'Unassigned');
      transactions.push({
        id: tx._id,
        leadId: tx.leadId._id,
        leadName: tx.leadId.name || 'Unknown',
        leadUsername: tx.leadId.username || '',
        leadPhone: tx.leadId.phone || '',
        type: 'Event Registration',
        amount: tx.amountPaid || 0,
        date: tx.transactionDate,
        agentName,
        eventName: tx.eventId ? tx.eventId.name : '',
        activityName: tx.activityId ? tx.activityId.name : '',
        offerApplied: tx.offerApplied || false,
        discountPercentage: tx.discountPercentage || 0
      });
    });

    // Process Legacy Fallback leads
    const legacyLeads = await Lead.find({
      isPipelineLead: true,
      isDeleted: { $ne: true },
      status: { $in: ['Won', 'Trial Membership'] },
      amountPaid: { $gt: 0 }
    }).populate('assignedTo', 'name').lean();

    // For each legacy lead, check if they have ANY membership transactions
    const legacyLeadIds = legacyLeads.map(l => l._id);
    const leadsWithTx = await MembershipTransaction.distinct('leadId', { leadId: { $in: legacyLeadIds } });
    const leadsWithTxSet = new Set(leadsWithTx.map(id => id.toString()));

    legacyLeads.forEach(lead => {
      if (leadsWithTxSet.has(lead._id.toString())) return;
      // Find the Won status timestamp from statusHistory
      let wonDate = lead.createdAt;
      if (lead.statusHistory && lead.statusHistory.length > 0) {
        const wonRecord = lead.statusHistory.filter(h => ['Won', 'Trial Membership'].includes(h.status)).pop();
        if (wonRecord) wonDate = wonRecord.timestamp;
      }
      transactions.push({
        id: `legacy-${lead._id}`,
        leadId: lead._id,
        leadName: lead.name || 'Unknown',
        leadUsername: lead.username || '',
        leadPhone: lead.phone || '',
        type: 'Legacy Membership',
        amount: lead.amountPaid || 0,
        date: wonDate,
        agentName: lead.assignedTo ? lead.assignedTo.name : 'Unassigned',
        offerApplied: false,
        discountPercentage: 0
      });
    });

    // Sort all transactions by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Collect unique agent names for filter dropdown
    const agentNames = [...new Set(transactions.map(t => t.agentName).filter(Boolean))].sort();

    res.json({ success: true, transactions, agents: agentNames });
  } catch (err) {
    console.error('Transaction history error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction history' });
  }
});

app.get('/api/analytics/wordcloud', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    const { calculateWordCloud } = require('./services/cronService');

    let cache = await Setting.findOne({ key: 'wordcloud_cache' });
    
    if (!cache || !cache.value) {
      const data = await calculateWordCloud();
      return res.status(200).json(data || []);
    }

    res.status(200).json(cache.value);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy leads to strip the { success, data } wrapper
app.get('/api/leads', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const query = { isPipelineLead: true, isDeleted: { $ne: true } };

    if (req.query.search) {
      query.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
        { tags: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.status) query.status = { $in: req.query.status.split(',') };
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.source) query.source = req.query.source;
    if (req.query.city) query.city = req.query.city;
    
    // Role-based restrictions
    if (req.user && req.user.role === 'agent') {
      query.assignedTo = req.user._id;
    } else if (req.query.assignedTo) {
      // Admin filtering by specific agent
      if (req.query.assignedTo === 'unassigned') {
        query.assignedTo = null;
      } else if (req.query.assignedTo === 'me') {
        query.assignedTo = req.user._id;
      } else {
        query.assignedTo = req.query.assignedTo;
      }
    } else if (req.query.assignedToMe === 'true') {
      query.assignedTo = req.user._id;
    }

    if (req.query.startDate || req.query.endDate) {
      if (req.query.filterByWonDate === 'true') {
         const dateQuery = {};
         if (req.query.startDate) dateQuery.$gte = new Date(req.query.startDate);
         if (req.query.endDate) dateQuery.$lte = new Date(req.query.endDate);
         
         const paidStatuses = ['Won', 'Event Registration', 'Trial Membership'];
         
         if (!query.$and) query.$and = [];
         query.$and.push({
           $or: [
              { 
                 statusHistory: { 
                    $elemMatch: { 
                       status: { $in: paidStatuses }, 
                       timestamp: dateQuery 
                    } 
                 } 
              },
              {
                 $and: [
                    { $or: [ { statusHistory: { $exists: false } }, { statusHistory: { $size: 0 } }, { "statusHistory.status": { $nin: paidStatuses } } ] },
                    { createdAt: dateQuery }
                 ]
              }
           ]
         });
      } else {
        query.createdAt = {};
        if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    let leadIdsToKeep = null;

    if (req.query.postId) {
      const Comment = require('./models/Comment');
      const comments = await Comment.find({ mediaId: req.query.postId });
      leadIdsToKeep = comments.map(c => String(c.leadId));
    }

    if (req.query.customerType) {
      const types = req.query.customerType.split(',');
      const mappedStatuses = [];
      if (types.includes('member')) mappedStatuses.push('Won');
      if (types.includes('trialMember')) mappedStatuses.push('Trial Membership');
      if (types.includes('eventRegistrant')) mappedStatuses.push('Event Registration');
      
      if (mappedStatuses.length > 0) {
        if (query.status && query.status.$in) {
          query.status.$in = query.status.$in.filter(s => mappedStatuses.includes(s));
        } else {
          query.status = { $in: mappedStatuses };
        }
      }
    }

    if (req.query.tierId) {
      const MembershipTransaction = require('./models/MembershipTransaction');
      const mongoose = require('mongoose');
      
      const latestTxsByTier = await MembershipTransaction.aggregate([
        { $sort: { transactionDate: -1 } },
        { $group: { _id: "$leadId", tierId: { $first: "$tierId" } } },
        { $match: { tierId: new mongoose.Types.ObjectId(req.query.tierId) } }
      ]);
      
      const tierLeadIds = latestTxsByTier.map(t => String(t._id));
      if (leadIdsToKeep === null) {
        leadIdsToKeep = tierLeadIds;
      } else {
        leadIdsToKeep = leadIdsToKeep.filter(id => tierLeadIds.includes(id));
      }
    }

    if (req.query.membershipChangeType) {
      const changes = req.query.membershipChangeType.split(',');
      const conditions = [];
      if (changes.includes('new')) conditions.push({ 
        isRenewal: { $ne: true }, 
        isUpgrade: { $ne: true }, 
        isDowngrade: { $ne: true }, 
        isCancellation: { $ne: true } 
      });
      if (changes.includes('renewal')) conditions.push({ isRenewal: true });
      if (changes.includes('upgrade')) conditions.push({ isUpgrade: true });
      if (changes.includes('downgrade')) conditions.push({ isDowngrade: true });
      if (changes.includes('cancellation')) conditions.push({ isCancellation: true });
      
      if (conditions.length > 0) {
        if (!query.$and) query.$and = [];
        query.$and.push({ $or: conditions });
      }
    }

    if (req.query.renewalStartDate || req.query.renewalEndDate) {
      const start = req.query.renewalStartDate ? new Date(req.query.renewalStartDate) : new Date(0);
      const end = req.query.renewalEndDate ? new Date(req.query.renewalEndDate) : new Date(8640000000000000);
      
      const MembershipTransaction = require('./models/MembershipTransaction');
      const latestTxs = await MembershipTransaction.aggregate([
        { $sort: { transactionDate: -1 } },
        { $group: { _id: "$leadId", endDate: { $first: "$endDate" } } },
        { $match: { endDate: { $gte: start, $lte: end } } }
      ]);
      
      const renewalIds = latestTxs.map(t => String(t._id));
      if (leadIdsToKeep === null) {
        leadIdsToKeep = renewalIds;
      } else {
        leadIdsToKeep = leadIdsToKeep.filter(id => renewalIds.includes(id));
      }
    }

    if (leadIdsToKeep !== null) {
      query._id = { $in: leadIdsToKeep };
    }

    let sort = { createdAt: -1, _id: -1 };
    if (req.query.sort) {
      if (req.query.sort === 'updated_desc') sort = { updatedAt: -1, _id: -1 };
      if (req.query.sort === 'newest') sort = { createdAt: -1, _id: -1 };
      if (req.query.sort === 'oldest') sort = { createdAt: 1, _id: 1 };
      if (req.query.sort === 'username_asc') sort = { username: 1, _id: 1 };
      if (req.query.sort === 'username_desc') sort = { username: -1, _id: -1 };
    }

    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    
    let totalCount = 0;
    let leadsQuery = Lead.find(query).sort(sort).populate('assignedTo', 'name email');
    
    if (page && limit) {
      totalCount = await Lead.countDocuments(query);
      leadsQuery = leadsQuery.skip((page - 1) * limit).limit(limit);
    }
    
    const leads = await leadsQuery.lean();

    const leadIds = leads.map(l => l._id);
    const MembershipTransaction = require('./models/MembershipTransaction');
    const EventTransaction = require('./models/EventTransaction');
    
    const memTxs = await MembershipTransaction.find({ leadId: { $in: leadIds } })
      .populate('tierId', 'name')
      .sort({ transactionDate: -1 })
      .lean();
    const evtTxs = await EventTransaction.find({ leadId: { $in: leadIds } }, 'leadId');
    
    const memTxMap = {};
    memTxs.forEach(tx => {
      if (!memTxMap[tx.leadId]) memTxMap[tx.leadId] = [];
      memTxMap[tx.leadId].push(tx);
    });

    const evtTxMap = {};
    evtTxs.forEach(tx => {
      if (!evtTxMap[tx.leadId]) evtTxMap[tx.leadId] = true;
    });

    const enrichedLeads = leads.map(lead => {
      const types = [];
      let renewalDate = null;
      let membershipTier = null;
      
      // Determine customer types based on status to ensure legacy leads get tags
      if (lead.status === 'Won') {
        types.push('Member');
      } else if (lead.status === 'Trial Membership') {
        types.push('Trial Member');
      } else if (lead.status === 'Event Registration') {
        types.push('Event Registrant');
      }

      // If they have modern membership transactions, extract tier and renewal date
      if (memTxMap[lead._id]) {
        renewalDate = memTxMap[lead._id][0].endDate;
        if (memTxMap[lead._id][0].tierId) {
          membershipTier = memTxMap[lead._id][0].tierId.name;
        }
      }
      return {
        ...lead,
        customerTypes: types,
        renewalDate: renewalDate,
        membershipTier: membershipTier
      };
    });

    if (page && limit) {
      res.json({
        data: enrichedLeads,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } else {
      res.json(enrichedLeads); // Fallback for any client still expecting an array
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy to create leads manually from client-new
app.post('/api/leads', require('./middleware/authMiddleware').protect, async (req, res) => {
  const Lead = require('./models/Lead');
  try {
    if (req.body.phone && req.body.phone.trim() !== '') {
      const existingLead = await Lead.findOne({
        phone: req.body.phone.trim(),
        isDeleted: { $ne: true }
      }).populate('assignedTo', 'name');
      if (existingLead) {
        const agentName = existingLead.assignedTo ? existingLead.assignedTo.name : 'Unassigned';
        return res.status(409).json({ 
          success: false, 
          error: `Phone number already exists. This lead is assigned to ${agentName}.`, 
          existingLeadId: existingLead._id 
        });
      }
    }

    const leadData = { 
      ...req.body, 
      isPipelineLead: true, 
      status: req.body.status || 'New',
      priority: req.body.priority || 'hot',
      statusHistory: [{
        status: req.body.status || 'New',
        timestamp: new Date()
      }],
      assignedTo: req.body.assignedTo || req.user._id
    };
    
    // Fix notes format: incoming from frontend might be a string
    if (typeof leadData.notes === 'string') {
      if (leadData.notes.trim()) {
        leadData.notes = [{
          text: leadData.notes.trim(),
          status: leadData.status,
          createdBy: req.user ? req.user._id : null,
          createdAt: new Date()
        }];
      } else {
        leadData.notes = [];
      }
    }

    const newLead = await Lead.create(leadData);
    res.json(newLead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/leads/bulk-delete', require('./middleware/authMiddleware').protect, async (req, res) => {
  const Lead = require('./models/Lead');
  try {
    await Lead.updateMany({ _id: { $in: req.body.leadIds } }, { $set: { isDeleted: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



// Auth compatibility proxy
const { login, register, getMe } = require('./controllers/authController');

app.post('/api/auth/crm/login', async (req, res) => {
  // We need to wrap the response to match what client-new expects
  const mockRes = {
    status: function(code) { 
      this.statusCode = code; 
      return this; 
    },
    json: function(data) {
      if (data.success && data.token) {
        return res.status(this.statusCode || 200).json({
          accessToken: data.token,
          refreshToken: data.token, // Mock refresh token
          user: { 
            _id: data.user ? data.user._id : data._id, 
            name: data.user ? data.user.name : data.name, 
            email: data.user ? data.user.email : data.email, 
            role: data.user ? data.user.role : (data.role || 'admin') 
          }
        });
      }
      return res.status(this.statusCode || 401).json(data);
    }
  };
  await login(req, mockRes);
});

app.post('/api/auth/crm/register', async (req, res) => {
  const mockRes = {
    status: function(code) { 
      this.statusCode = code; 
      return this; 
    },
    json: function(data) {
      if (data.success && data.token) {
        return res.status(this.statusCode || 200).json({ accessToken: data.token, refreshToken: data.token, user: { _id: data._id, name: data.name, email: data.email, role: data.role || 'admin' } });
      }
      return res.status(this.statusCode || 400).json(data);
    }
  };
  await register(req, mockRes);
});

app.get('/api/auth/crm/me', require('./middleware/authMiddleware').protect, async (req, res) => {
  const mockRes = {
    status: function(code) { 
      this.statusCode = code; 
      return this; 
    },
    json: function(data) {
      if (data.success && data.data) {
        return res.status(this.statusCode || 200).json(data.data);
      }
      return res.status(this.statusCode || 200).json(data);
    }
  };
  await getMe(req, mockRes);
});

app.post('/api/auth/crm/refresh', (req, res) => {
  res.json({ accessToken: req.body.refreshToken }); // Mock refresh
});
app.post('/api/auth/crm/logout', (req, res) => res.json({ success: true }));

app.get('/api/auth/crm/users', require('./middleware/authMiddleware').protect, async (req, res) => {
  const User = require('./models/User');
  const users = await User.find().select('-password');
  res.json(users);
});
app.post('/api/auth/crm/create-agent', require('./middleware/authMiddleware').protect, async (req, res) => {
  // Mock agent creation for backwards compatibility with client-new
  const User = require('./models/User');
  const newUser = await User.create(req.body);
  res.json(newUser);
});
app.put('/api/auth/crm/users/:id', require('./middleware/authMiddleware').protect, async (req, res) => {
  const User = require('./models/User');
  const updateData = { ...req.body };
  
  if (updateData.password) {
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(updateData.password, salt);
  }
  
  if (updateData.hasOwnProperty('designation')) {
    const newDesig = updateData.designation;
    if (newDesig !== 'Manager' && newDesig !== 'Mentor') {
      const Team = require('./models/Team');
      const SalaryConfig = require('./models/SalaryConfig');
      await Team.findOneAndDelete({ lead: req.params.id });
      await SalaryConfig.findOneAndUpdate(
        { agentId: req.params.id },
        { 
          $set: {
            teamTargets: [],
            managerIncentive: 0,
            managerRewardType: 'fixed',
            managerTeamTarget: 0,
            managerRenewalPercentage: 0
          } 
        }
      );
    }
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {new: true}).select('-password');
  res.json(user);
});
app.delete('/api/auth/crm/users/:id', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const User = require('./models/User');
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/rules-templates', require('./routes/crmRulesTemplates')); // Maps /api/rules-templates/rules

app.get('/api/connection-status', (req, res) => res.json({ connected: true, status: 'Active' }));



app.get('/api/account/posts', async (req, res) => {
  try {
    const axios = require('axios');
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) return res.json({ posts: [], nextMediaCursor: null, nextTagsCursor: null });
    
    // 1. Get IG Business Account ID
    const pageRes = await axios.get(`https://graph.facebook.com/v21.0/me?fields=instagram_business_account&access_token=${token}`);
    const igAccountId = pageRes.data?.instagram_business_account?.id;
    if (!igAccountId) return res.json({ posts: [], nextMediaCursor: null, nextTagsCursor: null });

    const { afterMedia, afterTags } = req.query;

    let mediaUrl = null;
    if (afterMedia !== 'done') {
      mediaUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=id,caption,media_url,thumbnail_url,timestamp,permalink&limit=20&access_token=${token}`;
      if (afterMedia) mediaUrl += `&after=${afterMedia}`;
    }

    const promises = [];
    if (mediaUrl) promises.push(axios.get(mediaUrl).then(r => ({ type: 'media', data: r.data })).catch(e => ({ type: 'media', error: e })));

    const results = await Promise.all(promises);

    let nextMediaCursor = afterMedia === 'done' ? 'done' : null;
    let nextTagsCursor = 'done'; // Hardcoded to done since we no longer fetch tags
    const rawPosts = [];

    for (const r of results) {
      if (r.error) {
        console.error(`[Posts API] Failed to fetch ${r.type}:`, r.error.response?.data || r.error.message);
        if (r.type === 'media') nextMediaCursor = 'done';
        continue;
      }
      rawPosts.push(...(r.data.data || []));
      
      const cursors = r.data.paging?.cursors;
      const nextUrl = r.data.paging?.next;
      
      if (r.type === 'media') {
        nextMediaCursor = nextUrl && cursors?.after ? cursors.after : 'done';
      }
    }

    // Deduplicate by ID and map
    const uniquePosts = [];
    const seen = new Set();
    for (const p of rawPosts) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        uniquePosts.push({
          id: p.id,
          mediaId: p.id,
          caption: p.caption || '',
          mediaUrl: p.media_url,
          thumbnailUrl: p.thumbnail_url || p.media_url,
          timestamp: p.timestamp,
          permalink: p.permalink
        });
      }
    }

    // Sort descending by timestamp (this only sorts the current batch)
    uniquePosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      posts: uniquePosts,
      nextMediaCursor,
      nextTagsCursor
    });
  } catch (err) {
    console.error('[Posts API Error]', err.response?.data || err.message);
    res.json({ posts: [], nextMediaCursor: 'done', nextTagsCursor: 'done' });
  }
});
app.get('/api/analytics/sync', (req, res) => res.json({ success: true }));

// Standard Routes
app.use('/api/auth', require('./routes/crmAuth'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/leads', require('./routes/crmLeads'));
app.use('/api/rules', require('./routes/crmRulesTemplates'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/analytics', require('./routes/crmAnalytics'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/configured-cities', require('./routes/configuredCityRoutes'));

// Client-new specific lead routes
app.get('/api/leads/agents', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const User = require('./models/User');
    const Team = require('./models/Team');
    
    let query = {};
    const team = await Team.findOne({ lead: req.user._id });
    if (team) {
      query._id = { $in: [...team.members, req.user._id] };
    }
    
    const agents = await User.find(query).select('name email role isActive');
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});
app.get('/api/leads/posts-with-leads', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Comment = require('./models/Comment');
    const Lead = require('./models/Lead');
    
    // Find all pipeline leads that came from comments
    const commentLeads = await Lead.find({ isPipelineLead: true, source: 'comment' }).select('_id');
    const leadIds = commentLeads.map(l => l._id);
    
    // Get distinct mediaIds from comments linked to those leads
    const mediaIds = await Comment.distinct('mediaId', { 
      leadId: { $in: leadIds },
      mediaId: { $ne: null, $exists: true }
    });
    
    res.json(mediaIds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts with leads' });
  }
});
app.get('/api/leads/:id/timeline', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const Message = require('./models/Message');
    const Conversation = require('./models/Conversation');
    
    const Comment = require('./models/Comment');
    
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const convQuery = { $or: [{ leadId: req.params.id }] };
    if (lead.platformUserId) {
      convQuery.$or.push({ instagramThreadId: `thread_${lead.platformUserId}` });
    }

    const convs = await Conversation.find(convQuery);
    const convIds = convs.map(c => c._id);
    const messages = await Message.find({ conversationId: { $in: convIds } });
    const comments = await Comment.find({ leadId: lead._id });
    
    const timeline = [
      ...messages.map(msg => ({
        id: msg._id,
        type: 'dm',
        text: msg.text,
        timestamp: msg.createdAt,
        sender: msg.direction === 'inbound' ? 'USER' : (msg.isAutomated ? 'BOT' : 'AGENT')
      })),
      ...comments.map(c => ({
        id: c.instagramCommentId || c._id,
        type: 'comment',
        text: c.text,
        timestamp: c.createdAt,
        sender: c.direction === 'outbound' ? (c.isAutomated ? 'BOT' : 'AGENT') : 'USER',
        mediaId: c.mediaId,
        mediaUrl: c.postThumbnail,
        postThumbnail: c.postThumbnail,
        postCaption: c.postCaption,
        replyToCommentId: c.parentCommentId
      }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({ timeline });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});
app.get('/api/leads/:id', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Lead = require('./models/Lead');
    const lead = await Lead.findById(req.params.id);
    res.json(lead);
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Allow sending messages via /api/messages/send (maps to conversations controller)
const messageRoutes = express.Router();
const { sendMessage } = require('./controllers/conversationController');
messageRoutes.post('/send', require('./middleware/authMiddleware').protect, async (req, res) => {
  const { recipientId, text } = req.body;
  
  try {
    const Lead = require('./models/Lead');
    const lead = await Lead.findOne({ platformUserId: recipientId });
    if (!lead) return res.status(404).json({ error: 'Lead not found for this platform user' });

    const Conversation = require('./models/Conversation');
    let conv = await Conversation.findOne({ leadId: lead._id });
    if (!conv) {
      const isWa = lead.platform === 'whatsapp';
      const threadKey = isWa ? 'whatsappThreadId' : 'instagramThreadId';
      const threadVal = isWa ? `wa_${recipientId}` : `thread_${recipientId}`;
      conv = await Conversation.create({ leadId: lead._id, [threadKey]: threadVal });
    }

    req.params.id = conv._id;
    req.body.receiverId = recipientId;
    return sendMessage(req, res);
  } catch(err) {
    console.error('[API] Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});
app.use('/api/messages', messageRoutes);
app.use('/api', require('./routes/membershipRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/salary', require('./routes/salaryRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/pl', require('./routes/plRoutes'));

app.get('/api/account/details', async (req, res) => {
  try {
    const axios = require('axios');
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) return res.json({ success: false, error: "No token configured" });
    
    const fields = 'id,name,category,emails,phone,website,followers_count,picture.type(large){url},instagram_business_account{id,username,profile_picture_url,followers_count,biography}';
    const pageRes = await axios.get(`https://graph.facebook.com/v21.0/me?fields=${fields}&access_token=${token}`);
    
    // Check if token expiry is available via debug_token endpoint
    let tokenValidDays = "Connected";
    try {
      const debugRes = await axios.get(`https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`);
      const expiresAt = debugRes.data?.data?.expires_at;
      if (expiresAt === 0) {
        tokenValidDays = "Non-expiring";
      } else if (expiresAt) {
        const daysLeft = Math.ceil((expiresAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
        tokenValidDays = `${daysLeft}d remaining`;
      }
    } catch (e) {
      console.error("[Account Details API] Failed to debug token", e.message);
    }
    
    let partners = [];
    try {
      const igAccountId = pageRes.data.instagram_business_account?.id;
      if (igAccountId) {
        try {
          const p1 = await axios.get(`https://graph.facebook.com/v21.0/${igAccountId}?fields=business_discovery.username(livingcollective.india){username,profile_picture_url,followers_count,biography}&access_token=${token}`);
          if (p1.data?.business_discovery) partners.push(p1.data.business_discovery);
        } catch (e1) {
          console.error("Failed to fetch livingcollective.india", e1.response?.data?.error || e1.message);
        }
        
        try {
          const p2 = await axios.get(`https://graph.facebook.com/v21.0/${igAccountId}?fields=business_discovery.username(the.umrah.company){username,profile_picture_url,followers_count,biography}&access_token=${token}`);
          if (p2.data?.business_discovery) partners.push(p2.data.business_discovery);
        } catch (e2) {
          console.error("Failed to fetch the.umrah.company", e2.response?.data?.error || e2.message);
        }
      }
    } catch (partnerErr) {
      console.error("[Account Details API] Failed to fetch partner accounts", partnerErr.message);
    }
    
    res.json({
      success: true,
      data: {
        ...pageRes.data,
        tokenValidDays,
        partners
      }
    });
  } catch (err) {
    console.error('[Account Details API] Error:', err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Failed to fetch account details from Meta" });
  }
});

app.get('/', (req, res) => {
  res.send('Instagram CRM API is running');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
