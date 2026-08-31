const { GetCountries, GetState, GetCity } = require('react-country-state-city');

let cachedCities = [];
let isReady = false;

async function initLocationData() {
  try {
    console.log('Initializing location service... (this may take a few seconds)');
    
    // We fetch the raw JSON files used by the library directly to build our joined index fast
    const [countriesRes, statesRes, citiesRes] = await Promise.all([
      fetch("https://venkatvidyut.github.io/react-country-state-city/data/countriesminified.json"),
      fetch("https://venkatvidyut.github.io/react-country-state-city/data/statesminified.json"),
      fetch("https://venkatvidyut.github.io/react-country-state-city/data/citiesminified.json")
    ]);
    
    const countries = await countriesRes.json();
    const statesData = await statesRes.json();
    const citiesData = await citiesRes.json();
    
    // Map for quick lookups
    const countryMap = new Map();
    countries.forEach(c => countryMap.set(c.id, c.name));
    
    const stateMap = new Map();
    statesData.forEach(cGroup => {
        const cId = cGroup.id;
        cGroup.states.forEach(s => {
            stateMap.set(`${cId}-${s.id}`, s.name);
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
                    id: city.id,
                    name: formattedName,
                    searchStr: formattedName.toLowerCase(),
                    latitude: city.latitude,
                    longitude: city.longitude
                });
            });
        });
    });
    
    cachedCities = flatCities;
    isReady = true;
    console.log(`Location service initialized. Loaded ${cachedCities.length} cities.`);
    
  } catch (error) {
    console.error('Failed to initialize location service:', error);
  }
}

function searchCities(query) {
  if (!isReady || !query) return [];
  
  const q = query.toLowerCase().trim();
  const results = [];
  
  for (let i = 0; i < cachedCities.length; i++) {
    if (cachedCities[i].searchStr.includes(q)) {
      results.push(cachedCities[i].name);
      if (results.length >= 50) {
        break;
      }
    }
  }
  
  return results;
}

function getCityDetails(name) {
  if (!isReady || !name) return null;
  return cachedCities.find(c => c.name === name) || null;
}

module.exports = {
  initLocationData,
  searchCities,
  getCityDetails
};
