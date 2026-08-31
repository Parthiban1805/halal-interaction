const mongoose = require('mongoose');
require('dotenv').config();

const leadSchema = new mongoose.Schema({
  notes: mongoose.Schema.Types.Mixed
}, { strict: false });

const Lead = mongoose.model('Lead_Migration', leadSchema, 'leads');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB for migration');

    const leads = await Lead.find({ notes: { $type: "string" } });
    console.log(`Found ${leads.length} leads with string notes.`);

    let count = 0;
    for (const lead of leads) {
      if (typeof lead.notes === 'string') {
        const newNotesArray = [{
          text: lead.notes,
          status: lead.status || 'New',
          createdAt: lead.updatedAt || lead.createdAt || new Date()
        }];
        await Lead.updateOne({ _id: lead._id }, { $set: { notes: newNotesArray } });
        count++;
      }
    }
    console.log(`Successfully migrated ${count} leads.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

migrate();
