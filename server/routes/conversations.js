const express = require('express');
const { getConversations, getMessages, sendMessage } = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getConversations);

router.route('/:id/messages')
  .get(getMessages)
  .post(sendMessage);

module.exports = router;
