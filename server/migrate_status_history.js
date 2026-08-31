require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function migrateStatusHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const leads = await Lead.find({});
    let updatedCount = 0;

    for (const lead of leads) {
      if (lead.statusHistory && lead.statusHistory.length > 0) {
        continue; // Already migrated or has history
      }

      let history = [];
      
      // Always start with 'New' using createdAt
      history.push({
        status: 'New',
        timestamp: lead.createdAt
      });

      // Sort notes ascending (oldest first)
      const sortedNotes = [...(lead.notes || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      for (const note of sortedNotes) {
        if (!note.status) continue;
        
        const lastStatus = history[history.length - 1].status;
        if (note.status !== lastStatus) {
          history.push({
            status: note.status,
            timestamp: note.createdAt
          });
        }
      }

      // Check current status
      const lastStatus = history[history.length - 1].status;
      if (lead.status !== lastStatus) {
        history.push({
          status: lead.status,
          timestamp: lead.updatedAt
        });
      }

      await Lead.updateOne({ _id: lead._id }, { $set: { statusHistory: history } });
      updatedCount++;
    }

    console.log(`Migration complete. Migrated ${updatedCount} out of ${leads.length} leads.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateStatusHistory();
