const express = require('express');
const { verifyWebhook, handleEvent } = require('../controllers/webhookController');

const router = express.Router();

router.get('/instagram', verifyWebhook);
router.post('/instagram', handleEvent);

module.exports = router;
