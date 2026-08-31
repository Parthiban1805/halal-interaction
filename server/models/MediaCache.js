const mongoose = require('mongoose');

const mediaCacheSchema = new mongoose.Schema({
  instagramMediaId: {
    type: String,
    required: true,
    unique: true
  },
  mediaType: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']
  },
  mediaUrl: {
    type: String,
    required: true
  },
  permalink: {
    type: String
  },
  caption: {
    type: String
  },
  expiresAt: {
    type: Date // Meta CDN links expire, need to track and refresh
  }
}, { timestamps: true });

module.exports = mongoose.model('MediaCache', mediaCacheSchema);
