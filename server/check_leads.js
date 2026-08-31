const mongoose = require('mongoose');
const Lead = require('./server/models/Lead');
require('dotenv').config({ path: './server/.env' });

async function checkLeads() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const paymentPendingLeads = await Lead.find({ status: 'Payment Pending' });
  console.log(`Total Payment Pending leads: ${paymentPendingLeads.length}`);
  for (const lead of paymentPendingLeads) {
    console.log(`- Lead ID: ${lead._id}, Priority: ${lead.priority}, Created: ${lead.createdAt}, isPipelineLead: ${lead.isPipelineLead}`);
  }

  const allHotLeads = await Lead.find({ priority: 'hot' });
  console.log(`Total Hot leads: ${allHotLeads.length}`);
  
  mongoose.disconnect();
}

checkLeads();
