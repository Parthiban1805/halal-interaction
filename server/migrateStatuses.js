require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insta_crm');
    console.log('Connected to DB');

    // 1. Update Contacted to Sent WhatsApp
    const result = await Lead.updateMany(
      { status: 'Contacted' },
      { $set: { status: 'Sent WhatsApp' } }
    );
    console.log(`Migrated ${result.modifiedCount} leads from Contacted -> Sent WhatsApp`);

    // 2. Update status history (if applicable)
    try {
        const historyResult = await mongoose.connection.db.collection('leadstatushistories').updateMany(
            { newStage: 'Contacted' },
            { $set: { newStage: 'Sent WhatsApp' } }
        );
        const historyResultOld = await mongoose.connection.db.collection('leadstatushistories').updateMany(
            { oldStage: 'Contacted' },
            { $set: { oldStage: 'Sent WhatsApp' } }
        );
        console.log(`Migrated status histories to Sent WhatsApp`);
    } catch(err) {
        console.log("No external status history to migrate or error:", err.message);
    }

    // 3. Update inner statusHistory of Lead documents
    const leadsWithHistory = await Lead.find({ 'statusHistory.status': 'Contacted' });
    for (const lead of leadsWithHistory) {
      lead.statusHistory.forEach(h => {
        if (h.status === 'Contacted') {
          h.status = 'Sent WhatsApp';
        }
      });
      await lead.save();
    }
    console.log(`Migrated inner statusHistory for ${leadsWithHistory.length} leads.`);

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
