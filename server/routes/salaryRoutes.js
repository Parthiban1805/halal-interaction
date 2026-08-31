const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const SalaryConfig = require('../models/SalaryConfig');
const AgentPayout = require('../models/AgentPayout');
const MembershipTransaction = require('../models/MembershipTransaction');
const EventTransaction = require('../models/EventTransaction');
const Lead = require('../models/Lead');
const Team = require('../models/Team');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Helper to get start and end dates for a month in IST
const getMonthBoundaries = (periodStr) => {
  if (!periodStr) {
    const now = new Date();
    periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  
  const [year, month] = periodStr.split('-');
  
  const start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, -5, -30, 0, 0)); // IST midnight
  const end = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 18, 29, 59, 999)); // IST 23:59:59 end of month
  
  return { start, end, periodStr };
};

// Calculate revenue and deals for all agents
const calculateAgentPerformances = async (start, end) => {
  const memTxs = await MembershipTransaction.find({ transactionDate: { $gte: start, $lte: end } }).populate('leadId');
  const evTxs = await EventTransaction.find({ transactionDate: { $gte: start, $lte: end } }).populate('leadId');
  const teams = await Team.find().populate('members', '_id');
  
  const performances = {};

  const addRenewalRevenue = (agentIdStr, amount) => {
    const teamAsManager = teams.find(t => t.lead && t.lead.toString() === agentIdStr);
    const teamAsMember = teams.find(t => t.members && t.members.some(m => m._id.toString() === agentIdStr));

    if (teamAsManager) {
      if (!performances[agentIdStr]) performances[agentIdStr] = { revenue: 0, dealsWon: new Set(), renewalRevenue: 0 };
      performances[agentIdStr].renewalRevenue += amount;
      
      teamAsManager.members.forEach(member => {
        const memberId = member._id.toString();
        if (!performances[memberId]) performances[memberId] = { revenue: 0, dealsWon: new Set(), renewalRevenue: 0 };
        performances[memberId].renewalRevenue += amount;
      });
    } else if (teamAsMember) {
      if (!performances[agentIdStr]) performances[agentIdStr] = { revenue: 0, dealsWon: new Set(), renewalRevenue: 0 };
      performances[agentIdStr].renewalRevenue += amount;
      
      if (teamAsMember.lead) {
        const leadId = teamAsMember.lead.toString();
        if (!performances[leadId]) performances[leadId] = { revenue: 0, dealsWon: new Set(), renewalRevenue: 0 };
        performances[leadId].renewalRevenue += amount;
      }
    } else {
      if (!performances[agentIdStr]) performances[agentIdStr] = { revenue: 0, dealsWon: new Set(), renewalRevenue: 0 };
      performances[agentIdStr].renewalRevenue += amount;
    }
  };

  const processTx = (tx) => {
    if (!tx.leadId) return;
    const agentId = tx.createdBy ? tx.createdBy.toString() : (tx.leadId.assignedTo ? tx.leadId.assignedTo.toString() : null);
    if (!agentId) return;
    
    if (!performances[agentId]) {
      performances[agentId] = { revenue: 0, dealsWon: new Set(), renewalRevenue: 0 };
    }
    
    const amount = (tx.amountPaid || 0) / 1.18;
    performances[agentId].revenue += amount;
    
    if (tx.isRenewal) {
      addRenewalRevenue(agentId.toString(), amount);
    }
    
    if (tx.isCancellation) {
      performances[agentId].dealsWon.delete(tx.leadId._id.toString());
    } else {
      performances[agentId].dealsWon.add(tx.leadId._id.toString());
    }
  };

  memTxs.forEach(processTx);
  evTxs.forEach(processTx);

  // Legacy leads won this month without transactions
  const legacyLeads = await Lead.find({
    isPipelineLead: true,
    isDeleted: { $ne: true },
    status: { $in: ['Won', 'Trial Membership'] },
    amountPaid: { $gt: 0 },
    assignedTo: { $exists: true, $ne: null }
  });
  
  const legacyLeadIds = legacyLeads.map(l => l._id);
  const leadsWithTx = await MembershipTransaction.distinct('leadId', { leadId: { $in: legacyLeadIds } });
  const leadsWithTxSet = new Set(leadsWithTx.map(id => id.toString()));

  legacyLeads.forEach(lead => {
    if (leadsWithTxSet.has(lead._id.toString())) return;
    let wonDate = lead.createdAt;
    if (lead.statusHistory && lead.statusHistory.length > 0) {
      const wonRecord = lead.statusHistory.filter(h => ['Won', 'Trial Membership'].includes(h.status)).pop();
      if (wonRecord) wonDate = wonRecord.timestamp;
    }
    if (wonDate >= start && wonDate <= end) {
      const agentId = lead.assignedTo.toString();
      if (!performances[agentId]) performances[agentId] = { revenue: 0, dealsWon: new Set(), renewalRevenue: 0 };
      const excGstAmount = (lead.amountPaid || 0) / 1.18;
      performances[agentId].revenue += excGstAmount;
      if (lead.isRenewal) {
        addRenewalRevenue(agentId, excGstAmount);
      }
      performances[agentId].dealsWon.add(lead._id.toString());
    }
  });

  // Convert sets to counts
  Object.keys(performances).forEach(key => {
    performances[key].dealsWon = performances[key].dealsWon.size;
  });

  return performances;
};

// Compute incentive based on slab config and revenue performance
const computeIncentive = (config, revenue) => {
  if (!config || !config.incentives || config.incentives.length === 0 || revenue <= 0) return { total: 0, breakdown: [] };
  
  let totalIncentive = 0;
  let breakdown = [];

  // Sort slabs by minRevenue ascending to process them in order
  const slabs = [...config.incentives].sort((a, b) => a.minRevenue - b.minRevenue);

  for (const slab of slabs) {
    if (revenue <= slab.minRevenue) {
      break; // Revenue hasn't reached this slab
    }

    const slabUpperLimit = (slab.maxRevenue !== null && slab.maxRevenue !== undefined) ? slab.maxRevenue : Infinity;
    
    // Revenue applicable to THIS specific slab
    const applicableRevenueInSlab = Math.min(revenue, slabUpperLimit) - slab.minRevenue;
    
    if (applicableRevenueInSlab > 0) {
      const slabAmt = applicableRevenueInSlab * (slab.rewardPercentage / 100);
      totalIncentive += slabAmt;
      const rangeStr = slabUpperLimit === Infinity 
        ? `Above ₹${slab.minRevenue.toLocaleString('en-IN')}` 
        : `₹${slab.minRevenue.toLocaleString('en-IN')} - ₹${slabUpperLimit.toLocaleString('en-IN')}`;
      breakdown.push({ description: `Personal Sales: ${rangeStr} (${slab.rewardPercentage}%)`, amount: slabAmt });
    }
  }

  return { total: totalIncentive, breakdown };
};

// POST /api/salary/finalize
router.post('/finalize', protect, isAdmin, async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ success: false, error: 'Month period is required' });
    
    const { start, end, periodStr } = getMonthBoundaries(month);

    const agents = await User.find({ role: { $in: ['agent', 'admin', 'superadmin'] } }).select('name email role designation');
    const configs = await SalaryConfig.find();
    const teams = await Team.find().populate('members', '_id');
    const performances = await calculateAgentPerformances(start, end);
    
    const bulkOps = agents.map(agent => {
      const config = configs.find(c => c.agentId.toString() === agent._id.toString());
      const base = config ? config.baseSalary : 0;
      const perf = performances[agent._id.toString()] || { revenue: 0, dealsWon: 0, renewalRevenue: 0 };
      
      let teamMembers = [];
      if (agent.designation === 'Manager' || agent.designation === 'Mentor') {
         const myTeam = teams.find(t => t.lead && t.lead.toString() === agent._id.toString());
         if (myTeam) teamMembers = myTeam.members;
      }

      let renewalBonusAmt = 0;
      let renewalBonusDesc = '';
      let applicablePersonalRevenue = perf.revenue;

      if (config && config.managerRenewalPercentage && config.managerRenewalPercentage > 0 && perf.renewalRevenue > 0) {
         applicablePersonalRevenue = Math.max(0, perf.revenue - perf.renewalRevenue);
         renewalBonusAmt = (perf.renewalRevenue * config.managerRenewalPercentage) / 100;
         renewalBonusDesc = `Renewal Bonus (${config.managerRenewalPercentage}% of ₹${perf.renewalRevenue.toLocaleString('en-IN')})`;
      }

      const personalIncentiveRes = computeIncentive(config, applicablePersonalRevenue);
      const personalIncentive = personalIncentiveRes.total + renewalBonusAmt;
      
      let breakdown = [{ description: 'Base Salary', amount: base }];
      breakdown = breakdown.concat(personalIncentiveRes.breakdown);
      if (renewalBonusAmt > 0) breakdown.push({ description: renewalBonusDesc, amount: renewalBonusAmt });
      
      let teamIncentive = 0;
      if (agent.designation === 'Manager' && config) {
         let totalTeamRevenue = perf.revenue || 0;
         teamMembers.forEach(member => {
            totalTeamRevenue += (performances[member._id.toString()]?.revenue || 0);
         });
         
         if (totalTeamRevenue >= (config.managerTeamTarget || 0) && (config.managerTeamTarget || 0) > 0) {
            if (config.managerRewardType === 'percentage') {
               const extraRevenue = totalTeamRevenue - (config.managerTeamTarget || 0);
               if (extraRevenue > 0) {
                 const amt = (extraRevenue * (config.managerIncentive || 0)) / 100;
                 teamIncentive += amt;
                 breakdown.push({ description: `Team Target Bonus: Extra ₹${extraRevenue.toLocaleString('en-IN')} × ${config.managerIncentive}%`, amount: amt });
               }
            } else {
               const amt = config.managerIncentive || 0;
               teamIncentive += amt;
               breakdown.push({ description: `Team Target Bonus (Fixed)`, amount: amt });
            }
         }
      }

      if (agent.designation === 'Mentor' && config && config.teamTargets && config.teamTargets.length > 0) {
         config.teamTargets.forEach(tt => {
            const memberRev = performances[tt.memberId.toString()]?.revenue || 0;
            if (memberRev >= tt.targetRevenue && tt.targetRevenue > 0) {
               const amt = tt.mentorIncentive || 0;
               teamIncentive += amt;
               breakdown.push({ description: `Mentor Reward`, amount: amt });
            }
         });
      }

      const totalIncentive = personalIncentive + teamIncentive;
      const totalPayout = base + totalIncentive;

      return {
        updateOne: {
          filter: { agentId: agent._id, period: periodStr },
          update: {
            $set: {
              baseSalarySnapshot: base,
              revenueGenerated: perf.revenue,
              dealsWon: perf.dealsWon,
              incentiveEarned: totalIncentive,
              totalPayout: totalPayout,
              breakdown: breakdown,
              status: 'Finalized',
              configSnapshot: config ? {
                baseSalary: config.baseSalary,
                incentives: config.incentives,
                teamTargets: config.teamTargets,
                managerIncentive: config.managerIncentive,
                managerRewardType: config.managerRewardType,
                managerTeamTarget: config.managerTeamTarget,
                managerRenewalPercentage: config.managerRenewalPercentage
              } : {}
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await AgentPayout.bulkWrite(bulkOps);
    }

    res.json({ success: true, message: `Payouts for ${periodStr} finalized successfully!` });
  } catch (error) {
    console.error('Error finalizing payouts:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// GET /api/salary/me?month=2026-07
router.get('/me', protect, async (req, res) => {
  try {
    const { month } = req.query;
    const { start, end, periodStr } = getMonthBoundaries(month);

    const agentId = req.user._id;
    const agent = await User.findById(agentId).select('name email role designation');

    // Check Snapshot First
    const snapshot = await AgentPayout.findOne({ agentId, period: periodStr });
    if (snapshot) {
      return res.json({
        success: true,
        period: periodStr,
        data: {
          agentId,
          agentName: agent.name,
          designation: agent.designation,
          revenueGenerated: snapshot.revenueGenerated,
          dealsWon: snapshot.dealsWon,
          baseSalary: snapshot.baseSalarySnapshot,
          personalIncentive: snapshot.incentiveEarned,
          teamIncentive: 0,
          totalPayout: snapshot.totalPayout,
          breakdown: snapshot.breakdown,
          status: snapshot.status,
          config: snapshot.configSnapshot || null
        }
      });
    }

    const config = await SalaryConfig.findOne({ agentId });

    // Fetch Teams to calculate team revenue if manager/mentor
    let teamMembers = [];
    if (agent.designation === 'Manager' || agent.designation === 'Mentor') {
      const team = await Team.findOne({ lead: agentId }).populate('members', '_id');
      if (team) teamMembers = team.members.map(m => m._id.toString());
    }

    // Calculate Dynamically for this agent
    const performances = await calculateAgentPerformances(start, end);
    const agentPerf = performances[agentId.toString()] || { revenue: 0, dealsWon: 0, renewalRevenue: 0 };
    
    let base = config ? (config.baseSalary || 0) : 0;
    
    const { total: personalIncentive, breakdown: personalBreakdown } = computeIncentive(config, agentPerf.revenue);
    
    let teamIncentive = 0;
    let teamBreakdown = [];
    if (config && (agent.designation === 'Manager' || agent.designation === 'Mentor')) {
      let totalTeamRevenue = agentPerf.revenue || 0; // Include manager's own revenue
      teamMembers.forEach(memberId => {
        if (performances[memberId]) {
          totalTeamRevenue += performances[memberId].revenue;
        }
      });

      const managerTeamTarget = config.managerTeamTarget || 0;
      const managerRewardType = config.managerRewardType || 'fixed';
      const managerIncentiveVal = config.managerIncentive || 0;
      
      const extraRevenue = totalTeamRevenue - managerTeamTarget;
      
      if (managerTeamTarget > 0 && extraRevenue > 0) {
        if (managerRewardType === 'fixed') {
           teamIncentive = managerIncentiveVal;
           teamBreakdown.push({ description: `Team Target Bonus (Fixed): Total Rev ₹${totalTeamRevenue.toLocaleString('en-IN')} met Target ₹${managerTeamTarget.toLocaleString('en-IN')}`, amount: teamIncentive });
        } else if (managerRewardType === 'percentage') {
           teamIncentive = extraRevenue * (managerIncentiveVal / 100);
           teamBreakdown.push({ description: `Team Target Bonus: (Total Rev ₹${totalTeamRevenue.toLocaleString('en-IN')} - Target ₹${managerTeamTarget.toLocaleString('en-IN')}) = Extra ₹${extraRevenue.toLocaleString('en-IN')} × ${managerIncentiveVal}%`, amount: teamIncentive });
        }
      }
    }

    let renewalBonus = 0;
    let renewalBreakdown = [];
    if (config && config.managerRenewalPercentage > 0 && agentPerf.renewalRevenue > 0) {
      renewalBonus = agentPerf.renewalRevenue * (config.managerRenewalPercentage / 100);
      renewalBreakdown.push({ description: `Renewal Bonus (${config.managerRenewalPercentage}% of ₹${agentPerf.renewalRevenue.toLocaleString('en-IN')})`, amount: renewalBonus });
    }

    const breakdown = [
      { description: 'Base Salary', amount: base },
      ...personalBreakdown,
      ...teamBreakdown,
      ...renewalBreakdown
    ];

    const totalPayout = base + personalIncentive + teamIncentive + renewalBonus;

    const data = {
      agentId,
      agentName: agent.name,
      designation: agent.designation,
      revenueGenerated: agentPerf.revenue,
      dealsWon: agentPerf.dealsWon,
      baseSalary: base,
      personalIncentive,
      teamIncentive,
      totalPayout,
      breakdown,
      status: 'Current',
      config: config ? {
        baseSalary: config.baseSalary,
        incentives: config.incentives,
        managerTeamTarget: config.managerTeamTarget,
        managerRewardType: config.managerRewardType,
        managerIncentive: config.managerIncentive,
        managerRenewalPercentage: config.managerRenewalPercentage
      } : null
    };

    res.json({ success: true, data, period: periodStr });
  } catch (error) {
    console.error('Error fetching personal salary:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// GET /api/salary?month=2026-07
router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const { month } = req.query;
    const { start, end, periodStr } = getMonthBoundaries(month);

    const agents = await User.find({ role: { $in: ['agent', 'admin', 'superadmin'] } }).select('name email role designation');
    const configs = await SalaryConfig.find();
    
    // Check Snapshots
    const snapshots = await AgentPayout.find({ period: periodStr });

    // Fetch Teams to attach members to managers/mentors
    const teams = await Team.find().populate('members', 'name email role');
    
    // Calculate Dynamically (we'll only use this for agents without a snapshot)
    const performances = await calculateAgentPerformances(start, end);
    
    const result = agents.map(agent => {
      const snapshot = snapshots.find(s => s.agentId.toString() === agent._id.toString());
      
      let teamMembers = [];
      if (agent.designation === 'Manager' || agent.designation === 'Mentor') {
         const myTeam = teams.find(t => t.lead && t.lead.toString() === agent._id.toString());
         if (myTeam) {
            teamMembers = myTeam.members;
         }
      }

      if (snapshot) {
        const snapConfig = snapshot.configSnapshot || {};
        return {
          _id: agent._id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          designation: agent.designation,
          baseSalary: snapshot.baseSalarySnapshot,
          incentives: snapConfig.incentives || [],
          teamTargets: snapConfig.teamTargets || [],
          managerIncentive: snapConfig.managerIncentive || 0,
          managerRewardType: snapConfig.managerRewardType || 'fixed',
          managerTeamTarget: snapConfig.managerTeamTarget || 0,
          managerRenewalPercentage: snapConfig.managerRenewalPercentage || 0,
          revenueGenerated: snapshot.revenueGenerated,
          dealsWon: snapshot.dealsWon,
          calculatedIncentive: snapshot.incentiveEarned,
          totalPayout: snapshot.totalPayout,
          breakdown: snapshot.breakdown,
          status: snapshot.status,
          teamMembers
        };
      }

      const config = configs.find(c => c.agentId.toString() === agent._id.toString());
      const base = config ? config.baseSalary : 0;
      const perf = performances[agent._id.toString()] || { revenue: 0, dealsWon: 0, renewalRevenue: 0 };

      // Renewal Bonus Logic (For Everyone)
      let renewalBonusAmt = 0;
      let renewalBonusDesc = '';
      let applicablePersonalRevenue = perf.revenue;

      if (config && config.managerRenewalPercentage && config.managerRenewalPercentage > 0 && perf.renewalRevenue > 0) {
         // 1. Exclude personal renewal revenue from standard slab calculation
         applicablePersonalRevenue = Math.max(0, perf.revenue - perf.renewalRevenue);
         
         // 2. Calculate Renewal Bonus using pre-propagated renewalRevenue
         let totalRenewalRevenue = perf.renewalRevenue;
         renewalBonusAmt = (totalRenewalRevenue * config.managerRenewalPercentage) / 100;
         renewalBonusDesc = `Renewal Bonus (${config.managerRenewalPercentage}% of ₹${totalRenewalRevenue.toLocaleString('en-IN')})`;
      }

      const personalIncentiveRes = computeIncentive(config, applicablePersonalRevenue);
      const personalIncentive = personalIncentiveRes.total + renewalBonusAmt;
      
      let breakdown = [{ description: 'Base Salary', amount: base }];
      breakdown = breakdown.concat(personalIncentiveRes.breakdown);
      if (renewalBonusAmt > 0) {
         breakdown.push({ description: renewalBonusDesc, amount: renewalBonusAmt });
      }
      
      let teamIncentive = 0;
      
      if (agent.designation === 'Manager' && config) {
         let totalTeamRevenue = perf.revenue || 0; // Include manager's own revenue (both new & renewal)
         teamMembers.forEach(member => {
            totalTeamRevenue += (performances[member._id.toString()]?.revenue || 0);
         });
         
         if (totalTeamRevenue >= (config.managerTeamTarget || 0) && (config.managerTeamTarget || 0) > 0) {
            if (config.managerRewardType === 'percentage') {
               const extraRevenue = totalTeamRevenue - (config.managerTeamTarget || 0);
               if (extraRevenue > 0) {
                 const amt = (extraRevenue * (config.managerIncentive || 0)) / 100;
                 teamIncentive += amt;
                 breakdown.push({ description: `Team Target Bonus: (Total Rev ₹${totalTeamRevenue.toLocaleString('en-IN')} - Target ₹${(config.managerTeamTarget||0).toLocaleString('en-IN')}) = Extra ₹${extraRevenue.toLocaleString('en-IN')} × ${config.managerIncentive}%`, amount: amt });
               }
            } else {
               const amt = config.managerIncentive || 0;
               teamIncentive += amt;
               breakdown.push({ description: `Team Target Bonus (Fixed): Total Rev ₹${totalTeamRevenue.toLocaleString('en-IN')} met Target ₹${(config.managerTeamTarget||0).toLocaleString('en-IN')}`, amount: amt });
            }
         }
      }

      if (agent.designation === 'Mentor' && config && config.teamTargets && config.teamTargets.length > 0) {
         config.teamTargets.forEach(tt => {
            const memberRev = performances[tt.memberId.toString()]?.revenue || 0;
            if (memberRev >= tt.targetRevenue && tt.targetRevenue > 0) {
               const amt = tt.mentorIncentive || 0;
               teamIncentive += amt;
               const memberName = teamMembers.find(m => m._id.toString() === tt.memberId.toString())?.name || 'Member';
               breakdown.push({ description: `Mentor Reward (for ${memberName})`, amount: amt });
            }
         });
      }

      const totalIncentive = personalIncentive + teamIncentive;

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        designation: agent.designation,
        baseSalary: base,
        incentives: config ? config.incentives : [],
        teamTargets: config ? config.teamTargets : [],
        managerIncentive: config ? config.managerIncentive : 0,
        managerRewardType: config ? config.managerRewardType : 'fixed',
        managerTeamTarget: config ? config.managerTeamTarget : 0,
        managerRenewalPercentage: config ? config.managerRenewalPercentage : 0,
        teamMembers,
        revenueGenerated: perf.revenue,
        dealsWon: perf.dealsWon,
        calculatedIncentive: totalIncentive,
        totalPayout: base + totalIncentive,
        breakdown,
        status: 'Draft'
      };
    });

    res.json({ success: true, data: result, period: periodStr });
  } catch (error) {
    console.error('Error fetching salary configs:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});


// Update an agent's salary config
router.post('/:agentId', protect, isAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { month } = req.query; // e.g., 2026-07
    const { baseSalary, incentives, teamTargets, managerIncentive, managerRewardType, managerTeamTarget, managerRenewalPercentage } = req.body;

    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const { start, end, periodStr } = getMonthBoundaries(month);
    const { periodStr: currentPeriodStr } = getMonthBoundaries(null); // Current real-time month

    const configData = {
      baseSalary,
      incentives: incentives || [],
      managerRenewalPercentage: managerRenewalPercentage || 0,
      teamTargets: (agent.designation === 'Manager' || agent.designation === 'Mentor') ? (teamTargets || []) : [],
      managerIncentive: (agent.designation === 'Manager' || agent.designation === 'Mentor') ? (managerIncentive || 0) : 0,
      managerRewardType: (agent.designation === 'Manager' || agent.designation === 'Mentor') ? (managerRewardType || 'fixed') : 'fixed',
      managerTeamTarget: (agent.designation === 'Manager' || agent.designation === 'Mentor') ? (managerTeamTarget || 0) : 0
    };

    // --- RECALCULATE LOGIC ---
    const performances = await calculateAgentPerformances(start, end);
    const perf = performances[agentId.toString()] || { revenue: 0, dealsWon: 0, renewalRevenue: 0 };
    
    let teamMembers = [];
    if (agent.designation === 'Manager' || agent.designation === 'Mentor') {
       const myTeam = await Team.findOne({ lead: agentId }).populate('members', '_id');
       if (myTeam) teamMembers = myTeam.members;
    }

    let renewalBonusAmt = 0;
    let renewalBonusDesc = '';
    let applicablePersonalRevenue = perf.revenue;

    if (configData.managerRenewalPercentage && configData.managerRenewalPercentage > 0 && perf.renewalRevenue > 0) {
       applicablePersonalRevenue = Math.max(0, perf.revenue - perf.renewalRevenue);
       renewalBonusAmt = (perf.renewalRevenue * configData.managerRenewalPercentage) / 100;
       renewalBonusDesc = `Renewal Bonus (${configData.managerRenewalPercentage}% of ₹${perf.renewalRevenue.toLocaleString('en-IN')})`;
    }

    const personalIncentiveRes = computeIncentive(configData, applicablePersonalRevenue);
    const personalIncentive = personalIncentiveRes.total + renewalBonusAmt;
    
    let breakdown = [{ description: 'Base Salary', amount: configData.baseSalary }];
    breakdown = breakdown.concat(personalIncentiveRes.breakdown);
    if (renewalBonusAmt > 0) breakdown.push({ description: renewalBonusDesc, amount: renewalBonusAmt });
    
    let teamIncentive = 0;
    if (agent.designation === 'Manager') {
       let totalTeamRevenue = perf.revenue || 0;
       teamMembers.forEach(member => {
          totalTeamRevenue += (performances[member._id.toString()]?.revenue || 0);
       });
       
       if (totalTeamRevenue >= (configData.managerTeamTarget || 0) && (configData.managerTeamTarget || 0) > 0) {
          if (configData.managerRewardType === 'percentage') {
             const extraRevenue = totalTeamRevenue - (configData.managerTeamTarget || 0);
             if (extraRevenue > 0) {
               const amt = (extraRevenue * (configData.managerIncentive || 0)) / 100;
               teamIncentive += amt;
               breakdown.push({ description: `Team Target Bonus: Extra ₹${extraRevenue.toLocaleString('en-IN')} × ${configData.managerIncentive}%`, amount: amt });
             }
          } else {
             const amt = configData.managerIncentive || 0;
             teamIncentive += amt;
             breakdown.push({ description: `Team Target Bonus (Fixed)`, amount: amt });
          }
       }
    }

    if (agent.designation === 'Mentor' && configData.teamTargets && configData.teamTargets.length > 0) {
       configData.teamTargets.forEach(tt => {
          const memberRev = performances[tt.memberId.toString()]?.revenue || 0;
          if (memberRev >= tt.targetRevenue && tt.targetRevenue > 0) {
             const amt = tt.mentorIncentive || 0;
             teamIncentive += amt;
             breakdown.push({ description: `Mentor Reward`, amount: amt });
          }
       });
    }

    const totalIncentive = personalIncentive + teamIncentive;
    const totalPayout = configData.baseSalary + totalIncentive;

    // Fetch existing snapshot to preserve status
    const existingSnapshot = await AgentPayout.findOne({ agentId, period: periodStr });
    const currentStatus = existingSnapshot ? existingSnapshot.status : 'Draft';

    // Always upsert to AgentPayout for the specifically requested month
    await AgentPayout.findOneAndUpdate(
      { agentId, period: periodStr },
      { 
        $set: { 
          configSnapshot: configData,
          baseSalarySnapshot: configData.baseSalary,
          revenueGenerated: perf.revenue,
          dealsWon: perf.dealsWon,
          incentiveEarned: totalIncentive,
          totalPayout: totalPayout,
          breakdown: breakdown,
          status: currentStatus
        } 
      },
      { upsert: true, new: true }
    );

    // If they are editing the CURRENT active month, also update the global defaults
    let globalConfig = await SalaryConfig.findOne({ agentId });
    if (periodStr === currentPeriodStr || !globalConfig) {
      if (globalConfig) {
        globalConfig.baseSalary = configData.baseSalary;
        globalConfig.incentives = configData.incentives;
        globalConfig.managerRenewalPercentage = configData.managerRenewalPercentage;
        globalConfig.teamTargets = configData.teamTargets;
        globalConfig.managerIncentive = configData.managerIncentive;
        globalConfig.managerRewardType = configData.managerRewardType;
        globalConfig.managerTeamTarget = configData.managerTeamTarget;
        await globalConfig.save();
      } else {
        globalConfig = await SalaryConfig.create({ agentId, ...configData });
      }
    }

    res.json({ success: true, data: configData, message: periodStr !== currentPeriodStr ? 'Month-specific config updated.' : 'Global config updated.' });
  } catch (error) {
    console.error('Error updating salary config:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
