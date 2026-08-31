const mongoose = require('mongoose');

const agentPayoutSchema = new mongoose.Schema({
  agentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  period: {
    type: String, // Format: YYYY-MM
    required: true
  },
  baseSalarySnapshot: {
    type: Number,
    required: true
  },
  revenueGenerated: {
    type: Number,
    default: 0
  },
  dealsWon: {
    type: Number,
    default: 0
  },
  incentiveEarned: {
    type: Number,
    default: 0
  },
  totalPayout: {
    type: Number,
    default: 0
  },
  breakdown: [{
    description: String,
    amount: Number
  }],
  status: {
    type: String,
    enum: ['Draft', 'Finalized', 'Paid'],
    default: 'Finalized'
  },
  configSnapshot: {
    baseSalary: Number,
    incentives: [{
      minRevenue: Number,
      maxRevenue: Number,
      rewardPercentage: Number
    }],
    teamTargets: [{
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      targetRevenue: Number,
      mentorIncentive: Number
    }],
    managerTeamTarget: Number,
    managerRewardType: { type: String, enum: ['fixed', 'percentage'] },
    managerIncentive: Number,
    managerRenewalPercentage: Number
  }
}, { timestamps: true });

// Ensure one payout per agent per month
agentPayoutSchema.index({ agentId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('AgentPayout', agentPayoutSchema);
