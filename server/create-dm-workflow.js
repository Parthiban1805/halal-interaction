const mongoose = require('mongoose');
const Workflow = require('./models/Workflow');
require('dotenv').config();

const createWorkflow = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    
    const workflow = await Workflow.create({
      name: 'Auto Reply on DM Help',
      trigger: 'dm',
      conditions: [
        { type: 'keyword_contains', value: 'help' }
      ],
      actions: [
        { type: 'create_lead', value: null },
        { type: 'send_dm', value: 'Hi there! How can our support team assist you today?' }
      ]
    });
    
    console.log(`✅ Successfully created Workflow: ${workflow.name}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create workflow:', err);
    process.exit(1);
  }
};

createWorkflow();
