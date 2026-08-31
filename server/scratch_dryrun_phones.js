require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const Lead = require('./models/Lead');
const User = require('./models/User');

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function getCountryName(code) {
  if (code === 'INVALID' || code === 'UNKNOWN_COUNTRY') return 'Unknown';
  try {
    return regionNames.of(code);
  } catch (e) {
    return code;
  }
}

async function dryRunPhones() {
  let logStream;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const outputFolder = 'dryrun_phones_country_output';
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
    }

    const leads = await Lead.find({ phone: { $ne: null, $ne: '' } }).populate('assignedTo', 'name');
    
    let validCount = 0;
    let invalidCount = 0;
    let modifiedCount = 0;

    const countryOutputs = {};
    const invalidLeads = [];

    for (const lead of leads) {
      if (!lead.phone) continue;
      const oldPhone = String(lead.phone).trim();
      let newPhone = null;
      let isValid = false;
      let isModified = false;
      let country = 'INVALID';

      // Clean up string first (remove spaces, dashes)
      let cleanedInput = oldPhone.replace(/[\s\-\.\(\)]/g, '');
      
      // Parse with libphonenumber-js (assuming India default if no country code)
      const phoneNumber = parsePhoneNumberFromString(cleanedInput, 'IN');
      
      if (phoneNumber && phoneNumber.isValid()) {
        isValid = true;
        validCount++;
        newPhone = phoneNumber.format('E.164'); // e.g. +919876543210
        country = phoneNumber.country || 'UNKNOWN_COUNTRY';

        if (newPhone !== oldPhone) {
          isModified = true;
          modifiedCount++;
        }
      } else {
        invalidCount++;
        newPhone = 'INVALID_OR_UNKNOWN_FORMAT';
        invalidLeads.push({
          lead,
          oldPhone,
          agentName: lead.assignedTo && lead.assignedTo.name ? lead.assignedTo.name : 'Unassigned'
        });
        continue; // Skip the rest of the loop for invalid leads, handled separately
      }

      if (!countryOutputs[country]) {
        const countryName = getCountryName(country);
        countryOutputs[country] = `--- Phone Number Cleaning Dry Run (Country: ${countryName} [${country}]) ---\n\nTotal: __COUNT__\n\n`;
      }

      // Log details
      let details = `Lead ID: ${lead._id}\n`;
      details += `Name: ${lead.name || 'Unknown'} (@${lead.username || 'unknown'})\n`;
      details += `Old Phone: ${oldPhone}\n`;
      details += `Standardized (E.164): ${newPhone}\n`;
      details += `Status: ${isValid ? (isModified ? 'MODIFIED' : 'ALREADY_STANDARD') : 'INVALID'}\n`;
      details += '--------------------------------------------------\n';
      
      countryOutputs[country] += details;
    }

    // Process Invalid Leads
    invalidLeads.sort((a, b) => a.agentName.localeCompare(b.agentName));

    let invalidStr = `--- Phone Number Cleaning Dry Run (INVALID / UNKNOWN) ---\n\nTotal: ${invalidCount}\n\n`;
    let currentAgent = null;

    for (const item of invalidLeads) {
      if (currentAgent !== item.agentName) {
        currentAgent = item.agentName;
        invalidStr += `==================================================\n`;
        invalidStr += `AGENT: ${currentAgent}\n`;
        invalidStr += `==================================================\n\n`;
      }
      invalidStr += `Lead ID: ${item.lead._id}\n`;
      invalidStr += `Name: ${item.lead.name || 'Unknown'} (@${item.lead.username || 'unknown'})\n`;
      invalidStr += `Old Phone: ${item.oldPhone}\n`;
      invalidStr += '--------------------------------------------------\n';
    }

    countryOutputs['INVALID'] = invalidStr;

    // Create CSV for Invalid Leads
    let csvStr = `"Agent","Lead ID","Name","Username","Old Phone"\n`;
    for (const item of invalidLeads) {
      const safeAgent = item.agentName.replace(/"/g, '""');
      const safeName = (item.lead.name || 'Unknown').replace(/"/g, '""');
      const safeUsername = (item.lead.username || 'unknown').replace(/"/g, '""');
      const safePhone = item.oldPhone.replace(/"/g, '""');
      csvStr += `"${safeAgent}","${item.lead._id}","${safeName}","${safeUsername}","${safePhone}"\n`;
    }
    fs.writeFileSync(`${outputFolder}/INVALID.csv`, csvStr);

    // Write all country files
    for (const c of Object.keys(countryOutputs)) {
      const count = (countryOutputs[c].match(/Lead ID:/g) || []).length;
      if (count > 0) {
        const finalStr = countryOutputs[c].replace('__COUNT__', count.toString());
        const countryName = getCountryName(c);
        const fileName = c === 'INVALID' ? 'INVALID.txt' : `${c}_${countryName.replace(/[\s\/]/g, '_')}.txt`;
        fs.writeFileSync(`${outputFolder}/${fileName}`, finalStr);
      }
    }

    let summaryStr = `\n--- GLOBAL SUMMARY ---\n`;
    summaryStr += `Total Leads with Phone: ${leads.length}\n`;
    summaryStr += `Valid/Formatted: ${validCount}\n`;
    summaryStr += `  - Required Modification: ${modifiedCount}\n`;
    summaryStr += `  - Already Standardized: ${validCount - modifiedCount}\n`;
    summaryStr += `Invalid/Unknown Format: ${invalidCount}\n\n`;
    summaryStr += `Files created in folder: ${outputFolder}\n`;

    fs.writeFileSync(`${outputFolder}/00_SUMMARY.txt`, summaryStr);
    console.log(`Dry run complete. Check the '${outputFolder}' folder.`);
    
  } catch (error) {
    console.error('Error during dry run:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

dryRunPhones();
