require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Lead = require('./models/Lead');
const User = require('./models/User'); // ensure populated assignedTo works

async function generateDuplicateLeadsReport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all leads that have a valid phone number and are not deleted
    const leads = await Lead.find({ 
      isDeleted: { $ne: true },
      phone: { 
        $exists: true, 
        $type: 'string',
        $nin: ['', 'undefined', 'null'] 
      } 
    }).populate('assignedTo', 'name');
    
    // Group leads by phone number
    const phoneGroups = {};
    for (const lead of leads) {
      if (!lead.phone) continue;
      const phone = String(lead.phone).trim();
      
      // Skip if after trimming it's empty or invalid
      if (!phone || phone === 'undefined' || phone === 'null') continue;

      if (!phoneGroups[phone]) {
        phoneGroups[phone] = [];
      }
      phoneGroups[phone].push(lead);
    }

    // Filter to only those with duplicates
    const duplicates = [];
    for (const [phone, group] of Object.entries(phoneGroups)) {
      if (group.length > 1) {
        duplicates.push({
          phone,
          leads: group
        });
      }
    }

    if (duplicates.length === 0) {
      console.log('No duplicate phone numbers found.');
      return;
    }

    console.log(`Found ${duplicates.length} phone numbers with multiple leads.`);

    // Generate CSV
    const csvRows = [];
    // CSV Header
    csvRows.push(['Phone Number', 'Lead ID', 'Name', 'Username', 'Agent', 'Status', 'Priority', 'Created At'].map(v => `"${v}"`).join(','));

    for (const dup of duplicates) {
      for (const lead of dup.leads) {
        const row = [
          dup.phone,
          lead._id.toString(),
          lead.name || 'Unknown',
          lead.username || 'Unknown',
          lead.assignedTo ? lead.assignedTo.name : 'Unassigned',
          lead.status || 'New',
          lead.priority || 'normal',
          lead.createdAt ? new Date(lead.createdAt).toISOString() : 'Unknown'
        ];
        // Escape quotes and wrap in quotes
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      }
      // Add an empty row between groups for readability in CSV
      csvRows.push('');
    }

    const outputPath = path.join(__dirname, 'duplicate_leads_report_v3.csv');
    fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');

    console.log(`Report generated successfully at: ${outputPath}`);

  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

generateDuplicateLeadsReport();
