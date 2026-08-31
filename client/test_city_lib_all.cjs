const { GetAllCities } = require('react-country-state-city');

async function test() {
  console.time('GetAllCities');
  const allCities = await GetAllCities();
  console.timeEnd('GetAllCities');
  console.log('Total all cities:', allCities.length);
  if(allCities.length > 0) {
      console.log('Sample city:', allCities[0]);
  }
}
test();
