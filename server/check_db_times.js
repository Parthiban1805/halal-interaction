const mongoose = require('mongoose');
require('dotenv').config();
const Lead = require('./models/Lead');
const Message = require('./models/Message');
const Comment = require('./models/Comment');

async function checkDb() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  
  const lead = await Lead.findOne({ username: 'aswxn._03' });
  if (!lead) return console.log('Lead not found');
  
  console.log('Lead ID:', lead._id);
  
  const comments = await Comment.find({ leadId: lead._id }).sort({ createdAt: 1 });
  console.log('\n--- COMMENTS ---');
  for (const c of comments) {
    console.log(`${c.direction} | ${c.isAutomated ? 'BOT' : 'USER'} | ${c.createdAt.getTime()} | ${c.text}`);
  }
  
  const Message = require('./models/Message');
  const Conversation = require('./models/Conversation');
  const conv = await Conversation.findOne({ leadId: lead._id });
  if (conv) {
    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });
    console.log('\n--- MESSAGES ---');
    for (const m of messages) {
      console.log(`${m.direction} | ${m.isAutomated ? 'BOT' : 'USER'} | ${m.createdAt.getTime()} | ${m.text}`);
    }
  }
  
  process.exit(0);
}

checkDb();
