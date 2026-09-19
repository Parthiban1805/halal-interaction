const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  instagramMessageId: {
    type: String,
    sparse: true,
    unique: true
  },
  whatsappMessageId: {
    type: String,
    sparse: true,
    unique: true
  },
  senderId: {
    type: String, // Instagram ID
    required: true
  },
  receiverId: {
    type: String, // Instagram ID
    required: true
  },
  text: {
    type: String
  },
  attachments: [{
    type: { type: String }, // 'image', 'video', 'audio', 'file'
    url: String
  }],
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  isAutomated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
