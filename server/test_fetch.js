const http = require('http');

http.get('http://localhost:5000/api/leads?city=Hyd', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Status code:', res.statusCode);
      console.log('Response body:', Object.keys(parsed));
      if (parsed.data) {
        console.log('Data length:', parsed.data.length);
      }
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Raw data:', data.substring(0, 500));
    }
  });
}).on('error', (e) => {
  console.error(e);
});
