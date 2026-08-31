const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All event routes are restricted to superadmin
router.use(protect);
// Routes accessible by any authenticated user
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.get('/:id/activities', eventController.getEventActivities);
router.get('/:id/expenses', eventController.getEventExpenses);
router.get('/:id/participants', eventController.getEventParticipants);
router.get('/:id/eligible-customers', eventController.getEventEligibleCustomers);

// Restricted to superadmin
router.use(isAdmin);

// Event Routes
router.post('/', eventController.createEvent);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Event Activity Routes
router.post('/activities/bulk-delete', eventController.bulkDeleteEventActivities);
router.post('/:id/activities', eventController.createEventActivity);
router.put('/activities/:activityId', eventController.updateEventActivity);
router.delete('/activities/:activityId', eventController.deleteEventActivity);

// Event Expense Routes
router.post('/expenses/bulk-delete', eventController.bulkDeleteEventExpenses);
router.post('/:id/expenses', eventController.createEventExpense);
router.put('/expenses/:expenseId', eventController.updateEventExpense);
router.delete('/expenses/:expenseId', eventController.deleteEventExpense);

module.exports = router;
