const express = require('express');
const { verifyWebhook, handleEvent, handleChatSyncsEvent } = require('../controllers/webhookController');

const router = express.Router();

router.get('/instagram', verifyWebhook);
router.post('/instagram', handleEvent);
// Webhooks disabled in favor of polling scheduler
// router.post('/chatsyncs', handleChatSyncsEvent);

module.exports = router;
