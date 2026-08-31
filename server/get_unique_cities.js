require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

async function getUniqueCities() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const cities = await Lead.distinct('city');
    
    // Filter out null/undefined and empty strings, sort alphabetically
    const cleanCities = cities
      .filter(city => city && city.trim() !== '')
      .map(city => city.trim())
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Use a Set to remove case-insensitive duplicates (if we just want to see unique strings)
    const uniqueCities = [...new Set(cleanCities)];

    console.log(`\nFound ${uniqueCities.length} unique cities:\n`);
    uniqueCities.forEach(city => console.log(`- ${city}`));
    
    console.log(`\nNote: There are also ${cities.length - uniqueCities.length} empty or duplicate variations.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

getUniqueCities();
