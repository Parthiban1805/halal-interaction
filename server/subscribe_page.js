const axios = require('axios');
require('dotenv').config();

async function testDMValidation() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = '1044464132086459';
  const igId = '17841404725953361';

  console.log("Checking subscribed apps for Halal Interactions Page...");
  try {
    const subRes = await axios.post(`https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: token,
        subscribed_fields: 'messages,messaging_postbacks,feed'
      }
    });
    console.log("Subscribed apps response:", subRes.data);
  } catch (err) {
    console.error("Subscribed apps error:", err.response?.data || err.message);
  }
}

testDMValidation();
