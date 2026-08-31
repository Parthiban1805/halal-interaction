const { GetCountries, GetState, GetCity } = require('react-country-state-city');

async function test() {
  const countries = await GetCountries();
  console.log('Total countries:', countries.length);
  const firstCountryId = countries[0].id;
  const states = await GetState(firstCountryId);
  console.log('Total states in first country:', states.length);
  if (states.length > 0) {
      const cities = await GetCity(firstCountryId, states[0].id);
      console.log('Total cities in first state:', cities.length);
  }
}
test();
