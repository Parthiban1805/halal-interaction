const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { protect } = require('../middleware/authMiddleware');

// Protect all team routes
router.use(protect);

// GET /api/teams - Get all teams with populated lead and members
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('lead', 'name email role designation')
      .populate('members', 'name email role designation')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch teams' });
  }
});

// POST /api/teams - Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, lead, members } = req.body;
    
    // Check if team name already exists
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      return res.status(400).json({ success: false, error: 'A team with this name already exists' });
    }

    const team = await Team.create({ name, lead, members });
    const populatedTeam = await Team.findById(team._id)
      .populate('lead', 'name email role designation')
      .populate('members', 'name email role designation');
      
    res.status(201).json({ success: true, data: populatedTeam });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create team' });
  }
});

// PUT /api/teams/:id - Update an existing team
router.put('/:id', async (req, res) => {
  try {
    const { name, lead, members } = req.body;
    
    // Check for unique name if name is provided
    if (name) {
      const existingTeam = await Team.findOne({ name, _id: { $ne: req.params.id } });
      if (existingTeam) {
        return res.status(400).json({ success: false, error: 'A team with this name already exists' });
      }
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { name, lead, members },
      { new: true, runValidators: true }
    )
    .populate('lead', 'name email role designation')
    .populate('members', 'name email role designation');

    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    res.json({ success: true, data: team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update team' });
  }
});

// DELETE /api/teams/:id - Delete a team
router.delete('/:id', async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete team' });
  }
});

module.exports = router;
