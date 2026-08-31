const mongoose = require('mongoose');

const membershipTransactionSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Lead',
    required: true
  },
  tierId: {
    type: mongoose.Schema.ObjectId,
    ref: 'MembershipTier',
    required: true
  },
  subscriptionAmount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  isRenewal: {
    type: Boolean,
    default: false
  },
  isUpgrade: {
    type: Boolean,
    default: false
  },
  isDowngrade: {
    type: Boolean,
    default: false
  },
  isCancellation: {
    type: Boolean,
    default: false
  },
  offerApplied: {
    type: Boolean,
    default: false
  },
  discountPercentage: {
    type: Number
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('MembershipTransaction', membershipTransactionSchema);
