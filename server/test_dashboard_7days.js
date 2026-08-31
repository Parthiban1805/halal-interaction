const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Message = require('./models/Message');
  const Comment = require('./models/Comment');
  
  let startLimit = new Date();
  startLimit.setDate(startLimit.getDate() - 6);
  startLimit.setHours(0,0,0,0);
  let endLimit = new Date();
  endLimit.setHours(23,59,59,999);

  const dateQuery = { createdAt: { $gte: startLimit, $lte: endLimit } }; 
  console.log("dateQuery", dateQuery);

  const incomingDMs = await Message.countDocuments({ ...dateQuery, direction: 'inbound' });
  const outgoingDMs = await Message.countDocuments({ ...dateQuery, direction: 'outbound' });
  const incomingComments = await Comment.countDocuments({ ...dateQuery, direction: 'inbound' });
  const outgoingComments = await Comment.countDocuments({ ...dateQuery, direction: 'outbound' });
  
  const totalAutomatedDMs = await Message.countDocuments({ ...dateQuery, isAutomated: true });
  const totalAutomatedComments = await Comment.countDocuments({ ...dateQuery, isAutomated: true });
  const totalAutomations = totalAutomatedDMs + totalAutomatedComments;

  console.log("SOCIAL DATA RETURNED BY API (7 Days):");
  console.log({
    incomingDMs,
    outgoingDMs,
    incomingComments,
    outgoingComments,
    totalAutomations
  });

  process.exit(0);
});
