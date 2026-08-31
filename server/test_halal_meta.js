const axios = require('axios');
require('dotenv').config();

async function testServerApis() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  console.log("Testing with Page Access Token:", token ? token.slice(0, 20) + "..." : "NONE");

  try {
    const pageRes = await axios.get(`https://graph.facebook.com/v21.0/me`, {
      params: {
        access_token: token,
        fields: 'id,name,category,instagram_business_account'
      }
    });
    console.log("Facebook Page Details:", pageRes.data);

    const igId = pageRes.data.instagram_business_account?.id;
    if (igId) {
      const igRes = await axios.get(`https://graph.facebook.com/v21.0/${igId}`, {
        params: {
          access_token: token,
          fields: 'id,username,name,profile_picture_url,biography,followers_count,media_count'
        }
      });
      console.log("Instagram Account Details:", igRes.data);

      const mediaRes = await axios.get(`https://graph.facebook.com/v21.0/${igId}/media`, {
        params: {
          access_token: token,
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
          limit: 3
        }
      });
      console.log(`Fetched ${mediaRes.data.data?.length || 0} Instagram Posts/Reels successfully!`);
    }
  } catch (err) {
    console.error("API Test Error:", err.response?.data || err.message);
  }
}

testServerApis();
