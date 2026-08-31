require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const User = require('./models/User');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the Super Admin user
    const superAdmin = await User.findOne({ email: 'superadmin@gmail.com' });
    if (!superAdmin) {
      console.error('Super Admin not found!');
      process.exit(1);
    }

    const leadDate = new Date('2026-07-12T10:00:00Z');

    // Create the manual lead
    const newLead = new Lead({
      name: 'Manual Lead (Hyd Event)', // You can customize this name
      platform: 'Manual',
      source: 'manual',
      priority: 'hot',
      status: 'Won',
      amountPaid: 750,
      assignedTo: superAdmin._id,
      isPipelineLead: true,
      createdAt: leadDate,
      notes: [{
        text: 'Hyd event registration',
        timestamp: leadDate,
        author: superAdmin.name
      }],
      statusHistory: [{
        status: 'Won',
        timestamp: leadDate
      }]
    });

    await newLead.save();
    console.log(`Successfully created lead "${newLead.name}"!`);
    console.log(`Lead ID: ${newLead._id}`);
    
  } catch (error) {
    console.error('Error creating lead:', error);
  } finally {
    mongoose.disconnect();
  }
}

run();
