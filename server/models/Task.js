const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['follow_up', 'call', 'demo', 'close']
  },
  notes: {
    type: String
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['Not Spoken', 'Not Picking', 'Spoken', 'Following Up', 'Pending Payment', 'Won', 'Lost', 'On Hold', 'Future City Lead', 'pending', 'completed'],
    default: 'Not Spoken'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  dueAt: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
