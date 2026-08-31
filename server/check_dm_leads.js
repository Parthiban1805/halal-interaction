const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Lead = require('./models/Lead');

  const totalDMs = await Lead.countDocuments({ source: 'dm' });
  const pipelineDMs = await Lead.countDocuments({ source: 'dm', isPipelineLead: true });
  const nonPipelineDMs = await Lead.countDocuments({ source: 'dm', isPipelineLead: false });

  console.log("DM Leads Analysis:");
  console.log(`Total DM leads in DB: ${totalDMs}`);
  console.log(`Pipeline DM leads (isPipelineLead: true): ${pipelineDMs}`);
  console.log(`Hidden DM leads (isPipelineLead: false): ${nonPipelineDMs}`);
  
  process.exit(0);
});
