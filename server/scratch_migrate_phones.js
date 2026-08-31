require('dotenv').config();
const mongoose = require('mongoose');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const Lead = require('./models/Lead');

async function migratePhones() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const leads = await Lead.find({ phone: { $ne: null, $ne: '' } });
    
    let validCount = 0;
    let modifiedCount = 0;
    let invalidCount = 0;
    let errorCount = 0;

    console.log(`Found ${leads.length} leads with phone numbers. Starting migration...`);

    for (const lead of leads) {
      if (!lead.phone) continue;
      const oldPhone = String(lead.phone).trim();
      
      // Clean up string first (remove spaces, dashes)
      let cleanedInput = oldPhone.replace(/[\s\-\.\(\)]/g, '');
      
      // Parse with libphonenumber-js (assuming India default if no country code)
      const phoneNumber = parsePhoneNumberFromString(cleanedInput, 'IN');
      
      if (phoneNumber && phoneNumber.isValid()) {
        validCount++;
        const newPhone = phoneNumber.format('E.164'); // e.g. +919876543210
        
        if (newPhone !== oldPhone) {
          try {
            await Lead.updateOne({ _id: lead._id }, { $set: { phone: newPhone } });
            console.log(`Updated Lead ${lead._id}: ${oldPhone} -> ${newPhone}`);
            modifiedCount++;
          } catch (updateErr) {
            console.error(`Failed to update Lead ${lead._id}:`, updateErr);
            errorCount++;
          }
        }
      } else {
        invalidCount++;
        // We do not modify invalid numbers as requested.
      }
    }

    console.log(`\n--- MIGRATION SUMMARY ---`);
    console.log(`Total Leads Processed: ${leads.length}`);
    console.log(`Valid Numbers: ${validCount}`);
    console.log(`Successfully Standardized (Updated in DB): ${modifiedCount}`);
    console.log(`Already Standard (Skipped): ${validCount - modifiedCount}`);
    console.log(`Invalid Numbers (Skipped): ${invalidCount}`);
    console.log(`Update Errors: ${errorCount}`);

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

migratePhones();
