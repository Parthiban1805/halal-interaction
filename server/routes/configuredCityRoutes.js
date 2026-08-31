const express = require('express');
const router = express.Router();
const ConfiguredCity = require('../models/ConfiguredCity');
const { protect } = require('../middleware/authMiddleware');
const { getCityDetails } = require('../services/locationService');

// @route   GET /api/configured-cities
// @desc    Get all configured cities
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const cities = await ConfiguredCity.find().sort({ name: 1 });
    res.json(cities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/configured-cities
// @desc    Add a configured city
// @access  Private (Admin/SuperAdmin should be checked ideally)
router.post('/', protect, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'City name is required' });
    }

    let city = await ConfiguredCity.findOne({ name });
    if (city) {
      return res.status(400).json({ error: 'City is already configured' });
    }

    const details = getCityDetails(name);

    city = new ConfiguredCity({
      name,
      latitude: details ? details.latitude : null,
      longitude: details ? details.longitude : null,
      addedBy: req.user._id
    });

    await city.save();
    res.status(201).json(city);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   DELETE /api/configured-cities/:id
// @desc    Delete a configured city
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const city = await ConfiguredCity.findById(req.params.id);
    
    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }

    await city.deleteOne();
    res.json({ message: 'City removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
