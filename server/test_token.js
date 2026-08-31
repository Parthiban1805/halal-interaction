require('dotenv').config({ path: './.env' });
const axios = require('axios');

async function testDebugToken() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  try {
    const res = await axios.get(`https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`);
    console.log("expires_at:", res.data.data.expires_at);
    console.log("is_valid:", res.data.data.is_valid);
    console.log("data_access_expires_at:", res.data.data.data_access_expires_at);
  } catch (err) {
    console.error("Error with page token:", err.response ? err.response.data : err.message);
  }
}

testDebugToken();
