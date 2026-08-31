const mongoose = require('mongoose');

const configuredCitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  latitude: {
    type: String
  },
  longitude: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ConfiguredCity', configuredCitySchema);
