const mongoose = require('mongoose');
const Workflow = require('./models/Workflow');
require('dotenv').config();

const createDetectOnlyWorkflow = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    
    // Deactivate old workflows so they don't accidentally send a reply
    await Workflow.updateMany({}, { isActive: false });
    console.log('Deactivated previous workflows to prevent conflicts.');
    
    const workflow = await Workflow.create({
      name: 'Silent Lead Capture (DM)',
      trigger: 'dm',
      conditions: [], // Empty conditions means it triggers on ALL incoming DMs
      actions: [
        { type: 'create_lead', value: null }
        // Notice there is NO 'send_dm' action here!
      ]
    });
    
    console.log(`✅ Successfully created Workflow: ${workflow.name}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create workflow:', err);
    process.exit(1);
  }
};

createDetectOnlyWorkflow();
