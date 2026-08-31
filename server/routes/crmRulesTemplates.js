const express = require('express');
const AutoReplyRule = require('../models/AutoReplyRule');
const ReplyTemplate = require('../models/ReplyTemplate');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Get Rules
router.get('/rules', async (req, res) => {
  try {
    const rules = await AutoReplyRule.find().populate('replyTemplateId');
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Rule
router.post('/rules', async (req, res) => {
  try {
    const rule = await AutoReplyRule.create(req.body);
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await ReplyTemplate.find();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Template
router.post('/templates', async (req, res) => {
  try {
    const template = await ReplyTemplate.create(req.body);
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
