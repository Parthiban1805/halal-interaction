const Event = require('../models/Event');
const EventActivity = require('../models/EventActivity');
const EventExpense = require('../models/EventExpense');
const EventTransaction = require('../models/EventTransaction');

exports.getEvents = async (req, res) => {
  try {
    const pipeline = [];
    
    if (req.query.activeOnly === 'true') {
      pipeline.push({ $match: { displayInList: { $ne: false } } });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'eventexpenses',
          localField: '_id',
          foreignField: 'eventId',
          as: 'expenses'
        }
      },
      {
        $lookup: {
          from: 'eventtransactions',
          localField: '_id',
          foreignField: 'eventId',
          as: 'transactions'
        }
      },
      {
        $addFields: {
          totalSpending: { $sum: '$expenses.amount' },
          totalRevenue: { $sum: '$transactions.amountPaid' }
        }
      },
      {
        $addFields: {
          netProfit: { $subtract: ['$totalRevenue', '$totalSpending'] }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    );

    const events = await Event.aggregate(pipeline);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getEventParticipants = async (req, res) => {
  try {
    const participants = await EventTransaction.find({ eventId: req.params.id })
      .populate('leadId', 'name email phone platform city username')
      .populate('activityId', 'title')
      .sort({ transactionDate: -1 });
    res.json(participants);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getEventEligibleCustomers = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!event.allowedTiers || event.allowedTiers.length === 0) {
      return res.json([]);
    }

    const MembershipTransaction = require('../models/MembershipTransaction');
    
    // Find all active transactions (endDate >= today), sorted by newest first
    const activeTransactions = await MembershipTransaction.find({
      endDate: { $gte: new Date() }
    }).populate('leadId', 'name email phone platform city username').sort({ transactionDate: -1, createdAt: -1 });

    const eligibleCustomers = [];
    const seenLeads = new Set();

    for (let tx of activeTransactions) {
      if (tx.leadId && !seenLeads.has(tx.leadId._id.toString())) {
        seenLeads.add(tx.leadId._id.toString());
        
        // Only include if their LATEST active transaction's tier is allowed
        const isTierAllowed = event.allowedTiers.some(
          allowedId => allowedId.toString() === tx.tierId.toString()
        );
        
        if (isTierAllowed) {
          eligibleCustomers.push(tx.leadId);
        }
      }
    }

    res.json(eligibleCustomers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { name, date, venue, description, allowedTiers, displayInList } = req.body;
    const newEvent = new Event({
      name, date, venue, description, allowedTiers, displayInList,
      status: 'Upcoming', // Force Upcoming on creation
      createdBy: req.user._id
    });
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid data' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { name, date, venue, description, status, allowedTiers, displayInList } = req.body;
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { name, date, venue, description, status, allowedTiers, displayInList },
      { new: true, runValidators: true }
    );
    if (!updatedEvent) return res.status(404).json({ error: 'Event not found' });
    res.json(updatedEvent);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid data' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) return res.status(404).json({ error: 'Event not found' });
    
    // Also delete associated activities and expenses
    await EventActivity.deleteMany({ eventId: req.params.id });
    await EventExpense.deleteMany({ eventId: req.params.id });

    res.json({ message: 'Event, associated activities, and expenses deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Activity controllers

exports.getEventActivities = async (req, res) => {
  try {
    const activities = await EventActivity.find({ eventId: req.params.id }).sort({ date: 1 });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createEventActivity = async (req, res) => {
  try {
    const { type, title, description, date, status, amount } = req.body;
    
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const newActivity = new EventActivity({
      eventId: req.params.id,
      type, title, description, date, status, amount: amount || 0,
      createdBy: req.user._id
    });
    const savedActivity = await newActivity.save();
    res.status(201).json(savedActivity);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid data' });
  }
};

exports.updateEventActivity = async (req, res) => {
  try {
    const { type, title, description, date, status, amount } = req.body;
    const updatedActivity = await EventActivity.findByIdAndUpdate(
      req.params.activityId,
      { type, title, description, date, status, amount: amount || 0 },
      { new: true, runValidators: true }
    );
    if (!updatedActivity) return res.status(404).json({ error: 'Activity not found' });
    res.json(updatedActivity);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid data' });
  }
};

exports.deleteEventActivity = async (req, res) => {
  try {
    const deletedActivity = await EventActivity.findByIdAndDelete(req.params.activityId);
    if (!deletedActivity) return res.status(404).json({ error: 'Activity not found' });
    res.json({ message: 'Activity deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Expense controllers

exports.getEventExpenses = async (req, res) => {
  try {
    const expenses = await EventExpense.find({ eventId: req.params.id }).sort({ date: 1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createEventExpense = async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const newExpense = new EventExpense({
      eventId: req.params.id, title, amount, category, date, description,
      createdBy: req.user._id
    });
    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid data' });
  }
};

exports.updateEventExpense = async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    const updatedExpense = await EventExpense.findByIdAndUpdate(
      req.params.expenseId,
      { title, amount, category, date, description },
      { new: true, runValidators: true }
    );
    if (!updatedExpense) return res.status(404).json({ error: 'Expense not found' });
    res.json(updatedExpense);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid data' });
  }
};

exports.deleteEventExpense = async (req, res) => {
  try {
    const deletedExpense = await EventExpense.findByIdAndDelete(req.params.expenseId);
    if (!deletedExpense) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.bulkDeleteEventActivities = async (req, res) => {
  try {
    const { activityIds } = req.body;
    if (!Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({ error: 'No activity IDs provided' });
    }
    await EventActivity.deleteMany({ _id: { $in: activityIds } });
    res.json({ message: 'Activities deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.bulkDeleteEventExpenses = async (req, res) => {
  try {
    const { expenseIds } = req.body;
    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({ error: 'No expense IDs provided' });
    }
    await EventExpense.deleteMany({ _id: { $in: expenseIds } });
    res.json({ message: 'Expenses deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

