const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  instagramCommentId: {
    type: String,
    required: true,
    unique: true
  },
  senderId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  mediaId: {
    type: String
  },
  postThumbnail: {
    type: String
  },
  postCaption: {
    type: String
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  parentCommentId: {
    type: String
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    default: 'inbound'
  },
  isAutomated: {
    type: Boolean,
    default: false
  },
  isReplied: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comment', commentSchema);
