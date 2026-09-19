const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  instagramThreadId: {
    type: String,
    sparse: true,
    unique: true
  },
  whatsappThreadId: {
    type: String,
    sparse: true,
    unique: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['open', 'resolved', 'ignored'],
    default: 'open'
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
