require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
mongoose.connect(process.env.MONGODB_URI).then(async () => { 
  const leads = await Lead.find({ status: { $in: ['Won', 'Event Registration', 'Trial Membership'] } }); 
  let counts = {}; 
  for(let l of leads){ counts[l.status] = (counts[l.status] || 0) + 1; } 
  console.log(counts); 
  process.exit(0); 
})
