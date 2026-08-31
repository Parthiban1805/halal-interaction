const mongoose = require('mongoose');

const leadStatusHistorySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  oldStage: {
    type: String,
    required: true
  },
  newStage: {
    type: String,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Could be null if changed automatically by system
  }
}, { timestamps: true });

module.exports = mongoose.model('LeadStatusHistory', leadStatusHistorySchema);
