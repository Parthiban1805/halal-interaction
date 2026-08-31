const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect('mongodb+srv://vkaswinkanan:6kZ5pZkxkjCYEtOH@cluster0.7ejtsim.mongodb.net/prod?appName=Cluster1');
    const Lead = require('./models/Lead');
    
    // Find how many leads match
    const matchQuery = { source: 'manual', status: 'Won', priority: 'normal' };
    const count = await Lead.countDocuments(matchQuery);
    console.log(`Found ${count} manual, normal, Won leads.`);
    
    // Update them
    const result = await Lead.updateMany(matchQuery, { $set: { priority: 'hot' } });
    console.log(`Updated ${result.modifiedCount} leads to hot priority.`);
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

main();
