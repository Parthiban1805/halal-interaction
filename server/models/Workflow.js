const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  trigger: {
    type: String,
    enum: ['comment', 'dm', 'mention', 'story_reply'],
    required: true
  },
  conditions: [{
    type: { type: String, enum: ['keyword_exact', 'keyword_contains', 'has_not_received_workflow'] },
    value: mongoose.Schema.Types.Mixed
  }],
  actions: [{
    type: { type: String, enum: ['send_dm', 'reply_comment', 'create_lead', 'add_tag', 'notify_team'] },
    value: mongoose.Schema.Types.Mixed,
    delaySeconds: { type: Number, default: 0 }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Workflow', workflowSchema);
