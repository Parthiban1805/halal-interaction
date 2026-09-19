require('dotenv').config();
const mongoose = require('mongoose');
const chatSyncService = require('./services/chatSyncService');
const Lead = require('./models/Lead');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

const mockWebhook = {
  from: '919876543210',
  name: 'Test WhatsApp User',
  message: 'Hello, this is a test lead from WhatsApp!',
  messageId: `wa_msg_${Date.now()}`,
  timestamp: Date.now()
};

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Sending mock webhook payload to ChatSyncService...');
    await chatSyncService.handleWebhook(mockWebhook);

    console.log('Checking if Lead was created...');
    const lead = await Lead.findOne({ platformUserId: mockWebhook.from, platform: 'whatsapp' });
    if (lead) {
      console.log('✅ Lead found:', lead.username, 'Source:', lead.source);
      
      const conv = await Conversation.findOne({ leadId: lead._id });
      if (conv) {
        console.log('✅ Conversation found:', conv.whatsappThreadId);
        
        const msgs = await Message.find({ conversationId: conv._id });
        console.log('✅ Messages count:', msgs.length);
        msgs.forEach(m => console.log('   ->', m.text));
      } else {
        console.log('❌ Conversation not found');
      }
    } else {
      console.log('❌ Lead not found');
    }

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

test();
