require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const User = require('./models/User');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the Super Admin user to assign to
    const superAdmin = await User.findOne({ email: 'superadmin@gmail.com' });
    if (!superAdmin) {
      console.error('Super Admin not found!');
      process.exit(1);
    }

    // Set a historical date for testing backdating logic
    const historicalDate = new Date('2025-11-15T10:00:00Z');

    // Create a legacy member lead (Won status, no transactions yet)
    const newLead = new Lead({
      name: 'Legacy Member Test',
      platform: 'Manual',
      source: 'manual',
      priority: 'normal',
      status: 'Won',
      amountPaid: 3500, // Legacy payment amount
      assignedTo: superAdmin._id,
      isPipelineLead: true,
      createdAt: historicalDate,
      isRenewal: false,
      notes: [{
        text: 'Legacy membership payment recorded',
        timestamp: historicalDate,
        author: superAdmin.name
      }],
      statusHistory: [{
        status: 'Won',
        timestamp: historicalDate
      }]
    });

    await newLead.save();
    console.log(`Successfully created test lead "${newLead.name}"!`);
    console.log(`Lead ID: ${newLead._id}`);
    
  } catch (error) {
    console.error('Error creating lead:', error);
  } finally {
    mongoose.disconnect();
  }
}

run();
