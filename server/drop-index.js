const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('leads');
    
    // Check if the index exists
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));
    
    const hasInstagramIndex = indexes.some(i => i.name === 'instagramId_1');
    if (hasInstagramIndex) {
      console.log('Dropping instagramId_1 index...');
      await collection.dropIndex('instagramId_1');
      console.log('Successfully dropped old unique index!');
    } else {
      console.log('Index instagramId_1 does not exist.');
    }
    
    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixIndex();
