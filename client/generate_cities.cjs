const fs = require('fs');
const path = require('path');

const dict = require('../../server/city_dictionary.json');
const cities = [...new Set(Object.values(dict).flat().filter(Boolean))].sort();

const content = `export const CITIES = ${JSON.stringify(cities, null, 2)};`;
const dir = path.join(__dirname, 'src', 'constants');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'cities.js'), content);
console.log('cities.js created');
