const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  username: {
    type: String
  },
  platformUserId: {
    type: String,
    sparse: true,
    unique: true
  },
  platform: {
    type: String,
    default: 'instagram'
  },
  name: {
    type: String
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  city: {
    type: String
  },
  age: {
    type: Number
  },
  dob: {
    type: Date
  },
  gender: {
    type: String
  },
  maritalStatus: {
    type: String
  },
  source: {
    type: String,
    enum: ['comment', 'dm', 'mention', 'manual', 'other'],
    default: 'dm'
  },
  status: {
    type: String,
    enum: ['New', 'Not Picking', 'Sent WhatsApp', 'Call Later', 'Spoken', 'Pitched Membership', 'Following Up', 'Payment Pending', 'Won', 'Lost', 'On Hold', 'Wrong Number'],
    default: 'New'
  },
  priority: {
    type: String,
    enum: ['normal', 'hot', 'super'],
    default: 'normal'
  },
  tags: [{
    type: String
  }],
  amountPaid: {
    type: Number,
    default: 0
  },
  amountPaidExclusive: {
    type: Number,
    default: 0
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
  notes: [{
    text: String,
    status: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isPipelineLead: {
    type: Boolean,
    default: false
  },
  activePathId: {
    type: String
  },
  activePathStepIndex: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
