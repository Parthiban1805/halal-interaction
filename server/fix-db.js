const mongoose = require('mongoose');
require('dotenv').config();

const cleanDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    
    const db = mongoose.connection.db;
    
    const Lead = require('./models/Lead');
    const Message = require('./models/Message');
    const Conversation = require('./models/Conversation');
    const Comment = require('./models/Comment');
    const Log = require('./models/Log');
    const Task = require('./models/Task');

    console.log('Clearing CRM Collections...');
    await Lead.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await Comment.deleteMany({});
    await Log.deleteMany({});
    await Task.deleteMany({});
    
    console.log('Database Cleanup complete! All Leads, Conversations, Messages, Comments, Logs, and Tasks have been wiped.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

cleanDb();
