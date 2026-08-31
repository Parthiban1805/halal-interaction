const mongoose = require('mongoose');

const membershipTierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a membership tier name'],
    unique: true,
    trim: true
  },
  defaultSubscriptionAmount: {
    type: Number,
    required: [true, 'Please add a default subscription amount']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  level: {
    type: Number,
    required: true,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('MembershipTier', membershipTierSchema);
