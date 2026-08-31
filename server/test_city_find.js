require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB.");

  // Get one unique city that isn't standard
  const sampleCityLead = await Lead.findOne({ city: { $exists: true, $ne: null, $ne: "" }, isDeleted: { $ne: true } });
  
  if (!sampleCityLead) {
    console.log("No leads with a city found at all.");
    process.exit(0);
  }

  const cityToSearch = sampleCityLead.city;
  console.log(`Found a sample lead with city: "${cityToSearch}"`);

  // Now emulate getLeads
  const filter = { isDeleted: { $ne: true }, city: cityToSearch };
  const leads = await Lead.find(filter);
  
  console.log(`Found ${leads.length} leads matching exactly "${cityToSearch}" using Lead.find(filter)`);

  process.exit(0);
}

test().catch(console.error);
