const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Message = require('./models/Message');
  const Comment = require('./models/Comment');
  const Lead = require('./models/Lead');

  const incomingDMs = await Message.countDocuments({ direction: 'inbound' });
  const outgoingDMs = await Message.countDocuments({ direction: 'outbound' });
  const incomingComments = await Comment.countDocuments({ direction: 'inbound' });
  const outgoingComments = await Comment.countDocuments({ direction: 'outbound' });
  
  const totalAutomatedDMs = await Message.countDocuments({ isAutomated: true });
  const totalAutomatedComments = await Comment.countDocuments({ isAutomated: true });

  const totalDMs = await Message.countDocuments();
  const totalComs = await Comment.countDocuments();

  console.log("DB RAW COUNTS:");
  console.log({
    incomingDMs,
    outgoingDMs,
    incomingComments,
    outgoingComments,
    totalAutomatedDMs,
    totalAutomatedComments,
    totalDMs,
    totalComs
  });

  const sampleDM = await Message.findOne();
  console.log("Sample DM:", sampleDM);
  const sampleComment = await Comment.findOne();
  console.log("Sample Comment:", sampleComment);

  process.exit(0);
});
