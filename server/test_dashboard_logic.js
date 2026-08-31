const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Message = require('./models/Message');
  const Comment = require('./models/Comment');
  const Lead = require('./models/Lead');

  const dateQuery = {}; // Simulate selecting "All Time"

  const incomingDMs = await Message.countDocuments({ ...dateQuery, direction: 'inbound' });
  const outgoingDMs = await Message.countDocuments({ ...dateQuery, direction: 'outbound' });
  const incomingComments = await Comment.countDocuments({ ...dateQuery, direction: 'inbound' });
  const outgoingComments = await Comment.countDocuments({ ...dateQuery, direction: 'outbound' });
  
  const totalAutomatedDMs = await Message.countDocuments({ ...dateQuery, isAutomated: true });
  const totalAutomatedComments = await Comment.countDocuments({ ...dateQuery, isAutomated: true });
  const totalAutomations = totalAutomatedDMs + totalAutomatedComments;

  console.log("SOCIAL DATA RETURNED BY API:");
  console.log({
    incomingDMs,
    outgoingDMs,
    incomingComments,
    outgoingComments,
    totalAutomations
  });

  process.exit(0);
});
