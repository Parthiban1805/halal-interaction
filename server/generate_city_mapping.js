require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Lead = require('./models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  console.log('Fetching all cities from DB...');
  const leads = await Lead.find({ city: { $exists: true, $ne: null, $ne: '' } }).select('city').lean();
  
  // Get unique raw city strings
  const uniqueRawCities = [...new Set(leads.map(l => l.city.trim()))].filter(Boolean);
  
  console.log(`Found ${uniqueRawCities.length} unique raw cities.`);
  
  console.log('Downloading location data...');
  const [countriesRes, statesRes, citiesRes] = await Promise.all([
    fetch("https://venkatvidyut.github.io/react-country-state-city/data/countriesminified.json"),
    fetch("https://venkatvidyut.github.io/react-country-state-city/data/statesminified.json"),
    fetch("https://venkatvidyut.github.io/react-country-state-city/data/citiesminified.json")
  ]);
  
  const countries = await countriesRes.json();
  const statesData = await statesRes.json();
  const citiesData = await citiesRes.json();
  
  const countryMap = new Map();
  countries.forEach(c => countryMap.set(c.id, c.name));
  
  const stateMap = new Map();
  statesData.forEach(cGroup => {
    cGroup.states.forEach(s => {
      stateMap.set(`${cGroup.id}-${s.id}`, s.name);
    });
  });

  const flatCities = [];
  citiesData.forEach(cGroup => {
    const cId = cGroup.id;
    const countryName = countryMap.get(cId);
    if (!countryName) return;
    
    cGroup.states.forEach(sGroup => {
      const sId = sGroup.id;
      const stateName = stateMap.get(`${cId}-${sId}`);
      if (!stateName) return;
      
      sGroup.cities.forEach(city => {
        const formattedName = `${city.name}, ${stateName}, ${countryName}`;
        flatCities.push({
          name: city.name.toLowerCase(),
          formatted: formattedName,
          countryId: cId,
          countryName: countryName
        });
      });
    });
  });

  console.log(`Loaded ${flatCities.length} standardized cities.`);

  const multiCityRegex = /[/,]|\band\b|\b&\b/i;

  let md = '# Proposed City Mapping\n\n';
  md += '| Original String | Proposed Mapping | Status |\n';
  md += '|---|---|---|\n';

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const raw of uniqueRawCities) {
    if (raw.endsWith('India') && raw.split(',').length >= 2) {
      md += `| ${raw} | - | Skipped (Already standard) |\n`;
      skippedCount++;
      continue;
    }
    
    if (multiCityRegex.test(raw)) {
      md += `| ${raw} | - | Skipped (Multi-city / Unstructured) |\n`;
      skippedCount++;
      continue;
    }

    const searchLower = raw.toLowerCase();
    const matches = flatCities.filter(c => c.name === searchLower);
    
    if (matches.length === 0) {
      md += `| ${raw} | - | ❌ Unmapped (Not found) |\n`;
      failCount++;
    } else {
      let bestMatch = matches.find(c => c.countryName === 'India');
      if (!bestMatch) {
        bestMatch = matches[0]; 
      }
      md += `| ${raw} | ${bestMatch.formatted} | ✅ Mapped |\n`;
      successCount++;
    }
  }

  md += `\n**Summary:**\n- Mapped: ${successCount}\n- Unmapped: ${failCount}\n- Skipped: ${skippedCount}\n`;

  const outPath = 'C:\\Users\\vkasw\\.gemini\\antigravity-ide\\brain\\078061b1-02ff-4ada-bd38-fcff612c7dd8\\city_mapping.md';
  fs.writeFileSync(outPath, md);
  console.log('Mapping generated successfully.');
  process.exit(0);
}
run();
