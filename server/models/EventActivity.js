const mongoose = require('mongoose');

const eventActivitySchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  type: {
    type: String,
    enum: ['Stall Booking', 'Meeting', 'Other'],
    default: 'Other'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('EventActivity', eventActivitySchema);
