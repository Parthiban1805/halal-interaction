const mongoose = require('mongoose');

const replyTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['dm', 'comment'],
    required: true
  },
  messageText: {
    type: String,
    required: true
  },
  mediaUrl: {
    type: String // Optional: if the template sends media/attachment
  }
}, { timestamps: true });

module.exports = mongoose.model('ReplyTemplate', replyTemplateSchema);
