const axios = require('axios');

async function testEndpoints() {
  const token = '23778|tx7YGDkJAOV9ybrDEg5iFithw6LifDJvS8iWkcnp5a139ce7';
  const baseUrl = 'https://platform.chatsyncs.com/api/v1';

  try {
    const res = await axios.get(`${baseUrl}/whatsapp/subscriber/list?apiToken=${token}&phone_number_id=1127014770503697&limit=100&offset=0`);
    const subscribers = res.data.message || [];
    const activeSubs = subscribers.filter(s => s.unseen_count > 0 || s.last_message_time !== null);
    
    console.log(`Total fetched: ${subscribers.length}`);
    console.log(`Active ones:`, activeSubs);
  } catch(e) { 
    console.log(`Error:`, e.response?.status, e.response?.data); 
  }
}
testEndpoints();
