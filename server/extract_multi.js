require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const User = require('./models/User');
const Lead = require('./models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find all leads where city is populated
  const leads = await Lead.find({ city: { $exists: true, $ne: null, $ne: '' } }).populate('assignedTo', 'name').select('name email phone city status assignedTo').lean();
  
  // Regex to match typical separators for multiple cities:
  const multiCityRegex = /[/,]|\band\b|\b&\b/i;
  
  const states = [
    'tamil nadu', 'tamilnadu', 'tn', 
    'karnataka', 'ka', 
    'maharashtra', 'mh', 
    'andhra pradesh', 'ap', 
    'telangana', 'ts', 
    'kerala', 'kl', 
    'gujarat', 'gj', 
    'delhi', 
    'uttar pradesh', 'up',
    'madhya pradesh', 'mp',
    'rajasthan', 'rj',
    'west bengal', 'wb',
    'haryana', 'hr',
    'punjab', 'pb',
    'bihar', 'br',
    'india', 'ind'
  ];

  const isStateOnly = (str) => {
    const cleaned = str.trim().toLowerCase().replace(/[^a-z\s]/g, '').trim();
    return states.includes(cleaned) || states.includes(str.trim().toLowerCase());
  };
  
  const multiCityLeads = leads.filter(l => {
    if (!l.city || !multiCityRegex.test(l.city)) return false;
    
    const parts = l.city.split(/[/,]|\band\b|\b&\b/i).map(p => p.trim()).filter(Boolean);
    if (parts.length <= 1) return false;
    
    const nonStateParts = parts.filter(p => !isStateOnly(p));
    return nonStateParts.length > 1;
  });
  let md = '# All Leads with Multiple Cities in DB\n\n';
  md += `Total Found: ${multiCityLeads.length}\n\n`;
  md += '| Name | Email | Phone | City | Status | Assigned To |\n';
  md += '|---|---|---|---|---|---|\n';
  
  multiCityLeads.forEach(l => {
    const assignedToName = l.assignedTo && l.assignedTo.name ? l.assignedTo.name : 'Unassigned';
    md += '| ' + (l.name || 'N/A') + ' | ' + (l.email || 'N/A') + ' | ' + (l.phone || 'N/A') + ' | ' + (l.city || 'N/A') + ' | ' + (l.status || 'N/A') + ' | ' + assignedToName + ' |\n';
  });
  
  const outPath = 'C:\\Users\\vkasw\\.gemini\\antigravity-ide\\brain\\078061b1-02ff-4ada-bd38-fcff612c7dd8\\all_multi_city_leads.md';
  fs.writeFileSync(outPath, md);
  console.log('Saved ' + multiCityLeads.length + ' leads to artifact.');
  process.exit(0);
}
run();
