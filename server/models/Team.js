const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a team name'],
    unique: true,
    trim: true
  },
  lead: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Please select a team lead']
  },
  members: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
