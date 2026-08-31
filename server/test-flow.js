const mongoose = require('mongoose');
const axios = require('axios');
const Workflow = require('./models/Workflow');
const Lead = require('./models/Lead');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const Log = require('./models/Log');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for testing');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const runTest = async () => {
  await connectDB();
  
  // Clear collections for clean test
  await Workflow.deleteMany({});
  await Lead.deleteMany({});
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await Log.deleteMany({});

  console.log('--- Setting up Workflow ---');
  // 1. Create a workflow
  const workflow = await Workflow.create({
    name: 'Auto Reply on Price Comment',
    trigger: 'comment',
    conditions: [
      { type: 'keyword_contains', value: 'price' }
    ],
    actions: [
      { type: 'create_lead', value: null },
      { type: 'send_dm', value: 'Hello! Here is our pricing guide.' }
    ]
  });
  console.log(`Workflow created: ${workflow.name}`);

  console.log('--- Simulating Webhook Comment ---');
  // 2. Simulate Webhook Call
  // Assuming the server is running on port 5000
  try {
    const webhookPayload = {
      object: 'instagram',
      entry: [
        {
          id: 'test_page_id',
          time: Date.now(),
          changes: [
            {
              field: 'comments',
              value: {
                from: { id: 'user_12345', username: 'test_user' },
                text: 'What is the price for this?',
                id: 'comment_111'
              }
            }
          ]
        }
      ]
    };
    
    // We can either call the API directly if server is running, or call the controller directly.
    // Let's invoke the service directly to avoid needing the express server running.
    const automationEngine = require('./services/automationEngine');
    
    await automationEngine.processEvent('comment', {
      senderId: 'user_12345',
      text: 'What is the price for this?',
      source: 'comment'
    });

    console.log('--- Verification ---');
    // 3. Verify Lead creation
    const lead = await Lead.findOne({ instagramId: 'user_12345' });
    if (lead) {
      console.log('✅ Lead successfully created');
    } else {
      console.log('❌ Lead not created');
    }

    // 4. Verify Message/DM action
    const message = await Message.findOne({ receiverId: 'user_12345', text: /pricing guide/i });
    if (message) {
      console.log('✅ Auto-DM successfully created');
    } else {
      console.log('❌ Auto-DM not created');
    }

    // 5. Verify Audit Log
    const log = await Log.findOne({ action: /Rule Triggered/ });
    if (log) {
      console.log('✅ Audit Log successfully generated');
    } else {
      console.log('❌ Audit Log not generated');
    }

  } catch (err) {
    console.error('Test failed', err);
  }

  process.exit();
};

runTest();
