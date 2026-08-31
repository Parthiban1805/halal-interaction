const express = require('express');
const router = express.Router();
const { searchCities } = require('../services/locationService');

router.get('/search', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.json([]);
  }

  const results = searchCities(q);
  res.json(results);
});

module.exports = router;
