const { initLocationData, searchCities } = require('./services/locationService');

async function test() {
  await initLocationData();
  const results = searchCities('salem');
  console.log('Results for "salem":', results);
  const resultsInd = searchCities('india');
  console.log('Results for "india":', resultsInd.slice(0, 5), `... (${resultsInd.length} total returned)`);
}

test();
