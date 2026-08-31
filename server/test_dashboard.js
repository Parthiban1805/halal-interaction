const fetch = require('node-fetch');

async function test() {
  const res = await fetch('http://localhost:5000/api/analytics/dashboard', {
    headers: {
      'Authorization': 'Bearer ' + 'dummy' // wait, I don't have a token. I'll just check server logs or run a bypass.
    }
  });
  console.log(await res.text());
}
test();
