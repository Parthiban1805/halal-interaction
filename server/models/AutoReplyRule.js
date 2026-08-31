const mongoose = require('mongoose');

const autoReplyRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  triggerType: {
    type: String,
    enum: ['comment', 'dm', 'mention'],
    required: true
  },
  keywords: [{
    type: String
  }],
  matchType: {
    type: String,
    enum: ['exact', 'contains', 'any'],
    default: 'contains'
  },
  targetMediaId: {
    type: String // Optional: if rule only applies to a specific post
  },
  replyTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReplyTemplate',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('AutoReplyRule', autoReplyRuleSchema);
