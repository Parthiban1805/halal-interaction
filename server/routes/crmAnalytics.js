const express = require('express');
const { getDashboardStats, getWordCloud } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/dashboard', getDashboardStats);
router.get('/wordcloud', getWordCloud);

module.exports = router;
