const mongoose = require('mongoose');

const incentiveSlabSchema = new mongoose.Schema({
  minRevenue: {
    type: Number,
    required: true,
    min: 0
  },
  maxRevenue: {
    type: Number,
    default: null
  },
  rewardPercentage: {
    type: Number,
    required: true,
    min: 0
  }
});

const teamMemberTargetSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetRevenue: { type: Number, required: true, default: 0 },
  mentorIncentive: { type: Number, default: 0 } // Reward for mentor if this specific member hits the target
});

const salaryConfigSchema = new mongoose.Schema({
  agentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  baseSalary: { 
    type: Number, 
    default: 0 
  },
  incentives: [incentiveSlabSchema],
  teamTargets: [teamMemberTargetSchema],
  managerIncentive: { type: Number, default: 0 },
  managerRewardType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  managerTeamTarget: { type: Number, default: 0 },
  managerRenewalPercentage: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SalaryConfig', salaryConfigSchema);
