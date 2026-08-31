const MembershipTier = require('../models/MembershipTier');
const MembershipTransaction = require('../models/MembershipTransaction');

// @desc    Get all membership tiers
// @route   GET /api/membership-tiers
// @access  Private
exports.getMembershipTiers = async (req, res) => {
  try {
    const tiers = await MembershipTier.find().sort({ level: 1 });
    res.status(200).json({ success: true, data: tiers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create new membership tier
// @route   POST /api/membership-tiers
// @access  Private/SuperAdmin
exports.createMembershipTier = async (req, res) => {
  try {
    const tier = await MembershipTier.create(req.body);
    res.status(201).json({ success: true, data: tier });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update membership tier
// @route   PUT /api/membership-tiers/:id
// @access  Private/SuperAdmin
exports.updateMembershipTier = async (req, res) => {
  try {
    const tier = await MembershipTier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!tier) {
      return res.status(404).json({ success: false, error: 'Membership tier not found' });
    }
    res.status(200).json({ success: true, data: tier });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete membership tier
// @route   DELETE /api/membership-tiers/:id
// @access  Private/SuperAdmin
exports.deleteMembershipTier = async (req, res) => {
  try {
    const tier = await MembershipTier.findByIdAndDelete(req.params.id);
    if (!tier) {
      return res.status(404).json({ success: false, error: 'Membership tier not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get membership details for a lead
// @route   GET /api/memberships/:leadId
// @access  Private
exports.getLeadMemberships = async (req, res) => {
  try {
    const transactions = await MembershipTransaction.find({ leadId: req.params.leadId })
      .populate('tierId')
      .sort({ transactionDate: -1 });
      
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create membership transaction for a lead
// @route   POST /api/memberships/:leadId
// @access  Private
exports.createMembershipTransaction = async (req, res) => {
  try {
    const transaction = await MembershipTransaction.create({
      ...req.body,
      leadId: req.params.leadId
    });
    
    // Populate tierId for response
    await transaction.populate('tierId');
    
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
