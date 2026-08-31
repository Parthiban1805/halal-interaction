const express = require('express');
const { connectMeta } = require('../controllers/metaController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/connect', connectMeta);

module.exports = router;
