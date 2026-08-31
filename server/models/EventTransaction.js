const mongoose = require('mongoose');

const eventTransactionSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Lead',
    required: true
  },
  eventId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event',
    required: true
  },
  activityId: {
    type: mongoose.Schema.ObjectId,
    ref: 'EventActivity',
    required: true
  },
  amountPaid: {
    type: Number,
    required: true
  },
  transactionDate: {
    type: Date,
    default: Date.now
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

module.exports = mongoose.model('EventTransaction', eventTransactionSchema);
