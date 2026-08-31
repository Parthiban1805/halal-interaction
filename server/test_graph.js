require('dotenv').config({ path: './.env' });
const axios = require('axios');

async function testGraphAPI() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("No token found");
    return;
  }
  try {
    const res = await axios.get(`https://graph.facebook.com/v21.0/me?fields=id,name,category,emails,phone,website,followers_count,picture,instagram_business_account{id,username,profile_picture_url,followers_count,biography}&access_token=${token}`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

testGraphAPI();
