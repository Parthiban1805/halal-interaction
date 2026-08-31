const express = require('express');
const router = express.Router();
const {
  getMembershipTiers,
  createMembershipTier,
  updateMembershipTier,
  getLeadMemberships,
  createMembershipTransaction,
  deleteMembershipTier
} = require('../controllers/membershipController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.route('/membership-tiers')
  .get(protect, getMembershipTiers)
  .post(protect, isAdmin, createMembershipTier);

router.route('/membership-tiers/:id')
  .put(protect, isAdmin, updateMembershipTier)
  .delete(protect, isAdmin, deleteMembershipTier);

router.route('/memberships/:leadId')
  .get(protect, getLeadMemberships)
  .post(protect, createMembershipTransaction);

module.exports = router;
