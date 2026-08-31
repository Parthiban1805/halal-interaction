const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB...");
    const Lead = require('./models/Lead');

    // Count before update
    const countBefore = await Lead.countDocuments({ source: 'dm', isPipelineLead: { $ne: true } });
    console.log(`Found ${countBefore} DM contacts that are currently hidden (not in pipeline).`);

    if (countBefore === 0) {
      console.log("No hidden DM contacts to convert.");
      process.exit(0);
    }

    // Update all hidden DM contacts to active pipeline leads with hot priority
    const result = await Lead.updateMany(
      { source: 'dm', isPipelineLead: { $ne: true } },
      { 
        $set: { 
          isPipelineLead: true,
          priority: 'hot',
          status: 'new' // Set status to 'new' for pipeline
        } 
      }
    );

    console.log(`Success! Updated ${result.modifiedCount} DM contacts to active hot leads in the pipeline.`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Database connection error:", err);
    process.exit(1);
  });
