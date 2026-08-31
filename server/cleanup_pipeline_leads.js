const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // Find leads that are DMs, normal priority, new status, no active path, no tags
  // We'll set isPipelineLead: false to hide them from the pipeline
  const res = await db.collection('leads').updateMany(
    { 
      source: 'dm',
      priority: 'normal',
      status: 'new',
      activePathId: null,
      $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }]
    }, 
    { $set: { isPipelineLead: false } }
  );
  console.log('Cleaned up pipeline leads:', res);
  process.exit(0);
});
