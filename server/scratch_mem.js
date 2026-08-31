require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
mongoose.connect(process.env.MONGODB_URI).then(async () => { 
  const leads = await Lead.find({ status: { $in: ['Won', 'Event Registration', 'Trial Membership'] } }); 
  const leadIds = leads.map(l => l._id); 
  const memTxs = await MembershipTransaction.find({ leadId: { $in: leadIds } }); 
  const memLeadIds = new Set(memTxs.map(t => t.leadId.toString())); 
  let memCount = 0; 
  let otherCount = 0; 
  let wonWithMem = 0; 
  let eventWithMem = 0; 
  let trialWithMem = 0; 
  for (const lead of leads) { 
    if (memLeadIds.has(lead._id.toString())) { 
      memCount++; 
      if (lead.status === 'Won') wonWithMem++; 
      if (lead.status === 'Event Registration') eventWithMem++; 
      if (lead.status === 'Trial Membership') trialWithMem++; 
    } else { 
      otherCount++; 
    } 
  } 
  console.log({ memCount, otherCount, wonWithMem, eventWithMem, trialWithMem }); 
  process.exit(0); 
})
