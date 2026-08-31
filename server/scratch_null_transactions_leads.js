require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const MembershipTransaction = require('./models/MembershipTransaction');
const EventTransaction = require('./models/EventTransaction');
const Lead = require('./models/Lead');

async function getNullTransactionLeads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find transactions where createdBy is missing
    const nullMembershipTxs = await MembershipTransaction.find({ createdBy: { $exists: false } }).select('leadId');
    const nullEventTxs = await EventTransaction.find({ createdBy: { $exists: false } }).select('leadId');

    // Collect unique lead IDs
    const leadIdsSet = new Set();
    
    nullMembershipTxs.forEach(tx => {
      if (tx.leadId) leadIdsSet.add(tx.leadId.toString());
    });
    
    nullEventTxs.forEach(tx => {
      if (tx.leadId) leadIdsSet.add(tx.leadId.toString());
    });

    const uniqueLeadIds = Array.from(leadIdsSet);
    console.log(`Found ${uniqueLeadIds.length} unique leads associated with transactions that have no creator.`);

    if (uniqueLeadIds.length === 0) {
      console.log('No leads found with null transactions.');
      return;
    }

    // Fetch the full lead details
    const leads = await Lead.find({ _id: { $in: uniqueLeadIds } });
    const leadMap = {};
    leads.forEach(l => { leadMap[l._id.toString()] = l; });

    // Generate CSV
    const csvRows = [];
    csvRows.push(['Lead ID', 'Name', 'Username', 'Status', 'Created At', 'Remark'].map(v => `"${v}"`).join(','));

    for (const leadIdStr of uniqueLeadIds) {
      const lead = leadMap[leadIdStr];
      if (lead) {
        const row = [
          leadIdStr,
          lead.name || 'Unknown',
          lead.username || 'Unknown',
          lead.status || 'Unknown',
          lead.createdAt ? new Date(lead.createdAt).toISOString() : 'Unknown',
          'Lead has no assigned agent'
        ];
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      } else {
        const row = [
          leadIdStr,
          'Lead Deleted',
          'Lead Deleted',
          'N/A',
          'N/A',
          'Orphan transaction (Lead deleted)'
        ];
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      }
    }

    const outputPath = path.join(__dirname, 'null_transaction_leads.csv');
    fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');

    console.log(`Report successfully saved to: ${outputPath}`);

  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

getNullTransactionLeads();
