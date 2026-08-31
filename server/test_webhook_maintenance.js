const axios = require('axios');

async function testWebhook() {
  try {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "test_maintenance_entry",
          time: Math.floor(Date.now() / 1000),
          messaging: [
            {
              sender: { id: "test_sender_123" },
              recipient: { id: "test_recipient_456" },
              timestamp: Date.now(),
              message: {
                text: "Hello during maintenance!"
              }
            }
          ]
        }
      ]
    };

    console.log("Sending simulated webhook payload...");
    const res = await axios.post('http://localhost:5000/api/webhooks/instagram', payload);
    console.log("Webhook response status:", res.status);
    console.log("Webhook response data:", res.data);
  } catch (err) {
    console.error("Error sending webhook:", err.response ? err.response.status : err.message);
  }
}

testWebhook();
