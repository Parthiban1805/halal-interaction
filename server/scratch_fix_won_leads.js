require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Lead = require('./models/Lead');
const User = require('./models/User'); // Required for populate
const MembershipTransaction = require('./models/MembershipTransaction');

async function findMisalignedMembershipLeads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Find all active membership transactions (not cancellations)
    const activeMemberships = await MembershipTransaction.find({
      isCancellation: { $ne: true }
    }).distinct('leadId');

    console.log(`Found ${activeMemberships.length} unique leads with active membership transactions.`);

    // 2. Find leads from this list whose status is NOT 'Won'
    const misalignedLeads = await Lead.find({
      _id: { $in: activeMemberships },
      status: { $ne: 'Won' },
      isDeleted: { $ne: true }
    }).populate('assignedTo', 'name');

    console.log(`Found ${misalignedLeads.length} leads that have memberships but are NOT in 'Won' status.`);

    if (misalignedLeads.length === 0) {
      console.log('All membership leads are correctly marked as Won!');
      return;
    }

    // 3. Generate CSV report
    const csvRows = [];
    csvRows.push(['Lead ID', 'Name', 'Username', 'Current Status', 'Agent', 'Created At'].map(v => `"${v}"`).join(','));

    for (const lead of misalignedLeads) {
      const row = [
        lead._id.toString(),
        lead.name || 'Unknown',
        lead.username || 'Unknown',
        lead.status || 'Unknown',
        lead.assignedTo ? lead.assignedTo.name : 'Unassigned',
        lead.createdAt ? new Date(lead.createdAt).toISOString() : 'Unknown'
      ];
      csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    }

    const outputPath = path.join(__dirname, 'misaligned_won_leads.csv');
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

findMisalignedMembershipLeads();
