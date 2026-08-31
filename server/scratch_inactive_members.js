require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Lead = require('./models/Lead');
const MembershipTransaction = require('./models/MembershipTransaction');
const MembershipTier = require('./models/MembershipTier');
const User = require('./models/User');

async function findInactiveMembers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all leads that are currently 'Won' or 'Trial Membership'
    const memberLeads = await Lead.find({
      status: { $in: ['Won', 'Trial Membership'] },
      isDeleted: { $ne: true }
    }).populate('assignedTo', 'name');

    console.log(`Found ${memberLeads.length} total leads with member statuses (Won/Trial).`);

    const flaggedLeads = [];
    const now = new Date();

    for (const lead of memberLeads) {
      // Find the latest membership transaction for this lead
      const latestTransaction = await MembershipTransaction.findOne({ 
        leadId: lead._id,
        isCancellation: { $ne: true }
      }).sort({ endDate: -1 }).populate('tierId', 'name');

      if (!latestTransaction) {
        flaggedLeads.push({
          lead,
          reason: 'No Membership Transaction found'
        });
      } else {
        // Check if the membership is expired
        if (latestTransaction.endDate && new Date(latestTransaction.endDate) < now) {
          flaggedLeads.push({
            lead,
            reason: `Membership Expired on ${new Date(latestTransaction.endDate).toLocaleDateString()}`
          });
        } else if (!latestTransaction.tierId) {
          flaggedLeads.push({
            lead,
            reason: 'Membership Transaction missing Tier ID'
          });
        }
      }
    }

    console.log(`Found ${flaggedLeads.length} leads that are members but lack an active membership tier.`);

    if (flaggedLeads.length === 0) {
      console.log('All members have an active membership tier!');
      return;
    }

    // Generate CSV report
    const csvRows = [];
    csvRows.push(['Lead ID', 'Name', 'Username', 'Current Status', 'Agent', 'Reason for Flag', 'Created At'].map(v => `"${v}"`).join(','));

    for (const item of flaggedLeads) {
      const lead = item.lead;
      const row = [
        lead._id.toString(),
        lead.name || 'Unknown',
        lead.username || 'Unknown',
        lead.status || 'Unknown',
        lead.assignedTo ? lead.assignedTo.name : 'Unassigned',
        item.reason,
        lead.createdAt ? new Date(lead.createdAt).toISOString() : 'Unknown'
      ];
      csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    }

    const outputPath = path.join(__dirname, 'inactive_members_report.csv');
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

findInactiveMembers();
