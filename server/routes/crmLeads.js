const express = require('express');
const { 
  getLeads, 
  updateLeadStage, 
  addNote, 
  getActivityFeed, 
  getLeadTransactions, 
  addLeadTransaction, 
  convertToEvent, 
  convertToMember,
  editMembershipTransaction,
  deleteMembershipTransaction,
  editEventTransaction,
  deleteEventTransaction,
  getDeletedLeads,
  restoreLead,
  getUniqueCities,
  bulkUpdateCity,
  getLeadsByCity
} = require('../controllers/leadController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/activity-feed')
  .get(getActivityFeed);

router.route('/deleted')
  .get(isAdmin, getDeletedLeads);

router.route('/unique-cities')
  .get(isAdmin, getUniqueCities);

router.route('/bulk-update-city')
  .put(isAdmin, bulkUpdateCity);

router.route('/by-city')
  .get(isAdmin, getLeadsByCity);

router.route('/')
  .get(getLeads);

router.route('/:id')
  .put(updateLeadStage);

router.route('/:id/notes')
  .post(addNote);

router.route('/:id/transactions')
  .get(getLeadTransactions)
  .post(addLeadTransaction);

router.route('/:id/transactions/membership/:txId')
  .put(isAdmin, editMembershipTransaction)
  .delete(isAdmin, deleteMembershipTransaction);

router.route('/:id/transactions/event/:txId')
  .put(isAdmin, editEventTransaction)
  .delete(isAdmin, deleteEventTransaction);

router.route('/:id/convert-to-event')
  .post(convertToEvent);

router.route('/:id/convert-to-member')
  .post(convertToMember);

router.route('/:id/restore')
  .put(isAdmin, restoreLead);

module.exports = router;
