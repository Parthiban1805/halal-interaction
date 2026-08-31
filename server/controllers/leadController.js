const Lead = require('../models/Lead');
const LeadStatusHistory = require('../models/LeadStatusHistory');
const User = require('../models/User');

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
  try {
    const filter = { isDeleted: { $ne: true } };
    if (req.query.city) {
      filter.city = req.query.city;
      console.log('Fetching leads for city:', req.query.city);
    }
    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${leads.length} leads for city filter.`);
    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get leads strictly by city
// @route   GET /api/leads/by-city
// @access  Private Admin
exports.getLeadsByCity = async (req, res) => {
  try {
    const filter = { isDeleted: { $ne: true } };
    if (req.query.city) {
      filter.city = req.query.city;
    } else {
      return res.status(400).json({ success: false, error: 'City is required' });
    }
    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update lead details (status, priority, etc)
// @route   PUT /api/leads/:id
// @access  Private
exports.updateLeadStage = async (req, res) => {
  try {
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    
    const oldStatus = lead.status;

    if (req.body.phone && req.body.phone.trim() !== '' && req.body.phone.trim() !== lead.phone) {
      const existingLead = await Lead.findOne({
        phone: req.body.phone.trim(),
        isDeleted: { $ne: true }
      }).populate('assignedTo', 'name');
      if (existingLead) {
        const agentName = existingLead.assignedTo ? existingLead.assignedTo.name : 'Unassigned';
        return res.status(409).json({ 
          success: false, 
          error: `Phone number already exists on another lead assigned to ${agentName}.`, 
          existingLeadId: existingLead._id 
        });
      }
    }



    if (req.body.status && req.body.status !== lead.status) {
      const pipelineOrder = {
        'New': 1,
        'Not Picking': 2,
        'Sent WhatsApp': 3,
        'Call Later': 4,
        'Spoken': 5,
        'Pitched Membership': 6,
        'Following Up': 7,
        'Payment Pending': 8,
        'Won': 9,
        'Lost': 10,
        'On Hold': 11,
        'Wrong Number': 12
      };
      
      const oldIndex = pipelineOrder[lead.status] || 0;
      const newIndex = pipelineOrder[req.body.status] || 0;
      
      const specialStatuses = ['On Hold', 'Wrong Number'];
      if (specialStatuses.includes(lead.status)) {
        if (req.body.status === 'New') {
          return res.status(400).json({ success: false, error: 'Cannot move a special status lead back to New.' });
        }
      } else if (oldIndex > 0 && newIndex > 0 && newIndex < oldIndex) {
        return res.status(400).json({ success: false, error: 'Lead status progression must move forward.' });
      }
      if (!req.body.newNote || !req.body.newNote.trim()) {
        return res.status(400).json({ success: false, error: 'A note is mandatory when changing the lead status.' });
      }
      
      if (['Won', 'Event Registration', 'Trial Membership'].includes(req.body.status)) {
        const { includeMembership, includeEvent } = req.body;
        
        // Backwards compatibility for old clients or UI without toggles
        const isMembershipOnly = includeMembership === undefined && includeEvent === undefined && req.body.status === 'Won';
        
        const shouldIncludeMembership = includeMembership || isMembershipOnly || req.body.status === 'Trial Membership';
        const shouldIncludeEvent = includeEvent || req.body.status === 'Event Registration';

        if (shouldIncludeMembership) {
          if (!req.body.membershipTierId || req.body.subscriptionAmount === undefined || !req.body.startDate || !req.body.endDate || req.body.amountPaid === undefined) {
            return res.status(400).json({ success: false, error: `Membership details are mandatory for ${req.body.status}.` });
          }
        }
        
        if (shouldIncludeEvent) {
          if (!req.body.eventId || !req.body.activityId || req.body.eventAmountPaid === undefined) {
            return res.status(400).json({ success: false, error: `Event details are mandatory for ${req.body.status}.` });
          }
        }
        
        if (!shouldIncludeMembership && !shouldIncludeEvent) {
           return res.status(400).json({ success: false, error: 'You must include either a Membership or an Event when converting this lead.' });
        }
      }
    }

    const { 
      newNote, notes, statusHistory, 
      membershipTierId, subscriptionAmount, startDate, endDate, offerApplied, discountPercentage,
      includeMembership, includeEvent, eventId, activityId, eventAmountPaid, eventOfferApplied, eventDiscountPercentage,
      ...otherUpdates 
    } = req.body;
    
    // Prevent modifying amountPaid or isRenewal if the lead was already Won
    if (lead.status === 'Won') {
      if (otherUpdates.amountPaid !== undefined) delete otherUpdates.amountPaid;
      if (otherUpdates.isRenewal !== undefined) delete otherUpdates.isRenewal;
    } else if (otherUpdates.amountPaid !== undefined) {
      // If we are setting amountPaid (newly Won lead), calculate exclusive
      otherUpdates.amountPaidExclusive = Number((otherUpdates.amountPaid / 1.18).toFixed(2));
    }

    const updateQuery = { $set: otherUpdates };

    if (req.body.status && req.body.status !== lead.status) {
      updateQuery.$push = updateQuery.$push || {};
      updateQuery.$push.statusHistory = {
        status: req.body.status,
        timestamp: new Date()
      };

      await LeadStatusHistory.create({
        leadId: lead._id,
        oldStage: lead.status,
        newStage: req.body.status,
        changedBy: req.user ? req.user._id : null
      });
    }

    if (newNote && newNote.trim()) {
      updateQuery.$push = updateQuery.$push || {};
      updateQuery.$push.notes = {
        $each: [{
          text: newNote.trim(),
          status: req.body.status || lead.status,
          createdBy: req.user ? req.user._id : null,
          createdAt: new Date()
        }],
        $position: 0
      };
    }

    lead = await Lead.findByIdAndUpdate(req.params.id, updateQuery, { new: true });

    // If the lead was just converted to a paid status, create the transactions
    const convertingToPaid = ['Won', 'Event Registration', 'Trial Membership'].includes(req.body.status) && req.body.status !== oldStatus;
    
    if (convertingToPaid) {
      const { includeMembership, includeEvent, eventId, activityId, eventAmountPaid, eventOfferApplied, eventDiscountPercentage } = req.body;
      
      const shouldIncludeMembership = includeMembership !== false && req.body.status !== 'Event Registration';
      const shouldIncludeEvent = includeEvent === true || req.body.status === 'Event Registration';
      
      if (shouldIncludeMembership && req.body.membershipTierId) {
        const MembershipTransaction = require('../models/MembershipTransaction');
        await MembershipTransaction.create({
          leadId: lead._id,
          tierId: membershipTierId,
          subscriptionAmount: subscriptionAmount,
          amountPaid: req.body.amountPaid,
          startDate: startDate,
          endDate: endDate,
          isRenewal: req.body.isRenewal || false,
          offerApplied: offerApplied || false,
          discountPercentage: discountPercentage || 0,
          createdBy: req.user ? req.user._id : null
        });
      }

      if (shouldIncludeEvent && eventId) {
        const EventTransaction = require('../models/EventTransaction');
        await EventTransaction.create({ 
          leadId: lead._id,
          eventId: eventId,
          activityId: activityId,
          amountPaid: eventAmountPaid,
          offerApplied: eventOfferApplied || false,
          discountPercentage: eventDiscountPercentage || 0,
          createdBy: req.user ? req.user._id : null
        });
      }
    }
    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add a note to a lead
// @route   POST /api/leads/:id/notes
// @access  Private
exports.addNote = async (req, res) => {
  try {
    const { newNote } = req.body;
    
    if (!newNote || !newNote.trim()) {
      return res.status(400).json({ success: false, error: 'Note text is required.' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const noteObject = {
      text: newNote.trim(),
      status: lead.status, // use current status
      createdBy: req.user ? req.user._id : null,
      createdAt: new Date()
    };

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: {
            $each: [noteObject],
            $position: 0
          }
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get activity feed for leads
// @route   GET /api/leads/activity-feed
// @access  Private
exports.getActivityFeed = async (req, res) => {
  try {
    const activities = await LeadStatusHistory.find()
      .populate('leadId', 'name username')
      .populate('changedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all transactions (Memberships and Events) for a lead
// @route   GET /api/leads/:id/transactions
// @access  Private
exports.getLeadTransactions = async (req, res) => {
  try {
    const MembershipTransaction = require('../models/MembershipTransaction');
    const EventTransaction = require('../models/EventTransaction');

    const [memberships, events] = await Promise.all([
      MembershipTransaction.find({ leadId: req.params.id })
        .populate('tierId')
        .populate('createdBy', 'name')
        .sort({ transactionDate: -1 }),
      EventTransaction.find({ leadId: req.params.id })
        .populate('eventId')
        .populate('activityId')
        .populate('createdBy', 'name')
        .sort({ transactionDate: -1 })
    ]);

    const formattedMemberships = memberships.map(m => ({
      ...m.toObject(),
      type: 'membership'
    }));

    const formattedEvents = events.map(e => ({
      ...e.toObject(),
      type: 'event'
    }));

    const combined = [...formattedMemberships, ...formattedEvents].sort((a, b) => {
      return new Date(b.transactionDate) - new Date(a.transactionDate);
    });

    res.status(200).json({
      success: true,
      data: combined
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add a transaction (Membership and/or Event) to a lead
// @route   POST /api/leads/:id/transactions
// @access  Private
exports.addLeadTransaction = async (req, res) => {
  try {
    const { 
      includeMembership, includeEvent, 
      membershipTierId, subscriptionAmount, startDate, endDate, amountPaid, isRenewal, isUpgrade, isDowngrade, offerApplied, discountPercentage,
      eventId, activityId, eventAmountPaid, eventOfferApplied, eventDiscountPercentage,
      isCancellation, cancellationDate
    } = req.body;

    const isMembershipOnly = includeMembership === undefined && includeEvent === undefined;

    if (includeMembership || isMembershipOnly) {
      if (isCancellation) {
        if (!membershipTierId || !cancellationDate || amountPaid === undefined) {
          return res.status(400).json({ success: false, error: 'Cancellation details (Tier, Cancellation Date, Refund Amount) are mandatory.' });
        }
      } else {
        if (!membershipTierId || subscriptionAmount === undefined || !startDate || !endDate || amountPaid === undefined) {
          return res.status(400).json({ success: false, error: 'Membership details (Tier, Subscription Amount, Start Date, End Date, Amount Paid) are mandatory.' });
        }
      }
    }

    if (includeEvent) {
      if (!eventId || !activityId || eventAmountPaid === undefined) {
        return res.status(400).json({ success: false, error: 'Event details (Event, Activity, Amount Paid) are mandatory.' });
      }
    }

    if (!includeMembership && !includeEvent && !isMembershipOnly) {
      return res.status(400).json({ success: false, error: 'You must include either a Membership or an Event transaction.' });
    }

    const createdTransactions = [];

    if (includeMembership || isMembershipOnly) {
      const MembershipTransaction = require('../models/MembershipTransaction');
      const MembershipTier = require('../models/MembershipTier');
      
      let finalIsUpgrade = isUpgrade || false;
      let finalIsDowngrade = isDowngrade || false;
      let finalIsRenewal = isRenewal !== undefined ? isRenewal : true;
      let finalIsCancellation = isCancellation || false;
      let finalAmountPaid = amountPaid;
      
      let finalStartDate = startDate;
      let finalEndDate = endDate;
      let finalSubscriptionAmount = subscriptionAmount;

      if (finalIsCancellation || finalIsDowngrade) {
        finalAmountPaid = -Math.abs(Number(amountPaid) || 0);
      }

      if (finalIsCancellation) {
        finalStartDate = cancellationDate;
        finalEndDate = cancellationDate;
        finalSubscriptionAmount = 0;
        finalIsRenewal = false;
        finalIsUpgrade = false;
        finalIsDowngrade = false;
      }

      const memTrans = await MembershipTransaction.create({
        leadId: req.params.id,
        tierId: membershipTierId,
        subscriptionAmount: finalSubscriptionAmount,
        amountPaid: finalAmountPaid,
        startDate: finalStartDate,
        endDate: finalEndDate,
        isRenewal: finalIsRenewal,
        isUpgrade: finalIsUpgrade,
        isDowngrade: finalIsDowngrade,
        isCancellation: finalIsCancellation,
        offerApplied: offerApplied || false,
        discountPercentage: discountPercentage || 0,
        createdBy: req.user ? req.user._id : null
      });
      
      const Lead = require('../models/Lead');
      const lead = await Lead.findById(req.params.id);

      if (finalIsCancellation) {
        await Lead.findByIdAndUpdate(req.params.id, { isCancellation: true });
      } else {
        if (lead && lead.status !== 'Won') {
          const oldStatus = lead.status;
          await Lead.findByIdAndUpdate(req.params.id, { 
            status: 'Won', 
            isCancellation: false,
            $push: {
              statusHistory: {
                status: 'Won',
                timestamp: new Date()
              }
            }
          });
          
          const LeadStatusHistory = require('../models/LeadStatusHistory');
          await LeadStatusHistory.create({
            leadId: lead._id,
            oldStage: oldStatus,
            newStage: 'Won',
            changedBy: req.user ? req.user._id : null
          });
        }
      }

      await memTrans.populate('tierId');
      createdTransactions.push({ ...memTrans.toObject(), type: 'membership' });
    }

    if (includeEvent) {
      const EventTransaction = require('../models/EventTransaction');
      const eventTrans = await EventTransaction.create({
        leadId: req.params.id,
        eventId: eventId,
        activityId: activityId,
        amountPaid: eventAmountPaid,
        offerApplied: eventOfferApplied || false,
        discountPercentage: eventDiscountPercentage || 0,
        createdBy: req.user ? req.user._id : null
      });
      await eventTrans.populate('eventId');
      await eventTrans.populate('activityId');
      createdTransactions.push({ ...eventTrans.toObject(), type: 'event' });
    }

    res.status(201).json({
      success: true,
      data: createdTransactions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Convert a legacy Won lead to Event Registrant
// @route   POST /api/leads/:id/convert-to-event
// @access  Private
exports.convertToEvent = async (req, res) => {
  try {
    const { eventId, activityId, amountPaid, offerApplied, discountPercentage } = req.body;
    
    if (!eventId || !activityId || amountPaid === undefined) {
      return res.status(400).json({ success: false, error: 'Event details (Event, Activity, Amount Paid) are mandatory.' });
    }

    const Lead = require('../models/Lead');
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }

    // Find the historical date when they were marked as Won (or Event Registration)
    let historicalWonDate = lead.createdAt;
    if (lead.statusHistory && lead.statusHistory.length > 0) {
      const wonEntries = lead.statusHistory.filter(h => h.status === 'Won' || h.status === 'Event Registration');
      if (wonEntries.length > 0) {
        // Sort ascending to get the earliest date
        wonEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        historicalWonDate = wonEntries[0].timestamp;
      }
    }

    // Update lead status
    lead.status = 'Event Registration';
    if (!lead.statusHistory) lead.statusHistory = [];
    lead.statusHistory.push({
      status: 'Event Registration',
      timestamp: new Date()
    });
    
    // We no longer zero out legacy amountPaid, preserving the historical data.
    // lead.amountPaid = 0;
    await lead.save();

    // Create backdated EventTransaction
    const EventTransaction = require('../models/EventTransaction');
    const eventTrans = await EventTransaction.create({
      leadId: lead._id,
      eventId: eventId,
      activityId: activityId,
      amountPaid: amountPaid,
      offerApplied: offerApplied || false,
      discountPercentage: discountPercentage || 0,
      transactionDate: historicalWonDate
    });

    res.status(200).json({
      success: true,
      data: {
        lead: lead,
        transaction: eventTrans
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Convert a legacy Won lead to Member
// @route   POST /api/leads/:id/convert-to-member
// @access  Private
exports.convertToMember = async (req, res) => {
  try {
    const { tierId, startDate, endDate, amountPaid } = req.body;
    
    if (!tierId || !startDate || !endDate || amountPaid === undefined) {
      return res.status(400).json({ success: false, error: 'Membership Tier, Start Date, End Date, and Amount Paid are mandatory.' });
    }

    const Lead = require('../models/Lead');
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }

    if (lead.status !== 'Won' && lead.status !== 'Trial Membership') {
      return res.status(400).json({ success: false, error: 'Lead must be in Won or Trial Membership status to convert to member.' });
    }

    // Find historical won date to backdate transactionDate
    let historicalWonDate = lead.createdAt;
    if (lead.statusHistory && lead.statusHistory.length > 0) {
      const wonEntries = lead.statusHistory.filter(h => h.status === 'Won' || h.status === 'Trial Membership');
      if (wonEntries.length > 0) {
        wonEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        historicalWonDate = wonEntries[0].timestamp;
      }
    }

    // We no longer clear legacy amountPaid, preserving historical data
    // lead.amountPaid = 0;
    await lead.save();

    // Create backdated MembershipTransaction
    const MembershipTransaction = require('../models/MembershipTransaction');
    const memTrans = await MembershipTransaction.create({
      leadId: lead._id,
      tierId: tierId,
      startDate: startDate,
      endDate: endDate,
      subscriptionAmount: amountPaid,
      amountPaid: amountPaid,
      transactionDate: historicalWonDate,
      isRenewal: lead.isRenewal || false,
      offerApplied: false,
      discountPercentage: 0
    });

    res.status(200).json({
      success: true,
      data: {
        lead: lead,
        transaction: memTrans
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Edit a membership transaction
// @route   PUT /api/leads/:id/transactions/membership/:txId
// @access  Private (Admin)
exports.editMembershipTransaction = async (req, res) => {
  try {
    const MembershipTransaction = require('../models/MembershipTransaction');
    const { txId, id } = req.params;
    
    const trans = await MembershipTransaction.findOne({ _id: txId, leadId: id });
    if (!trans) {
      return res.status(404).json({ success: false, error: 'Membership transaction not found.' });
    }

    const { tierId, startDate, endDate, subscriptionAmount, amountPaid, isRenewal, isUpgrade, isDowngrade, isCancellation, createdBy } = req.body;
    
    if (tierId) trans.tierId = tierId;
    if (startDate) trans.startDate = startDate;
    if (endDate) trans.endDate = endDate;
    if (subscriptionAmount !== undefined) trans.subscriptionAmount = subscriptionAmount;
    if (amountPaid !== undefined) trans.amountPaid = amountPaid;
    if (isRenewal !== undefined) trans.isRenewal = isRenewal;
    if (isUpgrade !== undefined) trans.isUpgrade = isUpgrade;
    if (isDowngrade !== undefined) trans.isDowngrade = isDowngrade;
    if (isCancellation !== undefined) trans.isCancellation = isCancellation;
    if (createdBy !== undefined) trans.createdBy = createdBy === '' ? null : createdBy;

    await trans.save();
    await trans.populate('tierId');

    res.status(200).json({ success: true, data: trans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a membership transaction
// @route   DELETE /api/leads/:id/transactions/membership/:txId
// @access  Private (Admin)
exports.deleteMembershipTransaction = async (req, res) => {
  try {
    const MembershipTransaction = require('../models/MembershipTransaction');
    const { txId, id } = req.params;
    
    const trans = await MembershipTransaction.findOneAndDelete({ _id: txId, leadId: id });
    if (!trans) {
      return res.status(404).json({ success: false, error: 'Membership transaction not found.' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Edit an event transaction
// @route   PUT /api/leads/:id/transactions/event/:txId
// @access  Private (Admin)
exports.editEventTransaction = async (req, res) => {
  try {
    const EventTransaction = require('../models/EventTransaction');
    const { txId, id } = req.params;
    
    const trans = await EventTransaction.findOne({ _id: txId, leadId: id });
    if (!trans) {
      return res.status(404).json({ success: false, error: 'Event transaction not found.' });
    }

    const { eventId, activityId, amountPaid, offerApplied, discountPercentage, createdBy } = req.body;
    
    if (eventId) trans.eventId = eventId;
    if (activityId) trans.activityId = activityId;
    if (amountPaid !== undefined) trans.amountPaid = amountPaid;
    if (offerApplied !== undefined) trans.offerApplied = offerApplied;
    if (discountPercentage !== undefined) trans.discountPercentage = discountPercentage;
    if (createdBy !== undefined) trans.createdBy = createdBy === '' ? null : createdBy;

    await trans.save();
    await trans.populate('eventId');
    await trans.populate('activityId');

    res.status(200).json({ success: true, data: trans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete an event transaction
// @route   DELETE /api/leads/:id/transactions/event/:txId
// @access  Private (Admin)
exports.deleteEventTransaction = async (req, res) => {
  try {
    const EventTransaction = require('../models/EventTransaction');
    const { txId, id } = req.params;
    
    const trans = await EventTransaction.findOneAndDelete({ _id: txId, leadId: id });
    if (!trans) {
      return res.status(404).json({ success: false, error: 'Event transaction not found.' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all deleted leads
// @route   GET /api/leads/deleted
// @access  Private (Admin/SuperAdmin)
exports.getDeletedLeads = async (req, res) => {
  try {
    const deletedLeads = await Lead.find({ isDeleted: true }).sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      count: deletedLeads.length,
      data: deletedLeads
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Restore a deleted lead
// @route   PUT /api/leads/:id/restore
// @access  Private (Admin/SuperAdmin)
exports.restoreLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }
    
    lead.isDeleted = false;
    await lead.save();

    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all unique cities with their lead counts
// @route   GET /api/leads/unique-cities
// @access  Private (Admin)
exports.getUniqueCities = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: { 
          city: { $exists: true, $ne: null, $ne: "" },
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          originalCity: "$_id",
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { originalCity: 1 }
      }
    ];

    const uniqueCities = await Lead.aggregate(pipeline);

    res.status(200).json({
      success: true,
      data: uniqueCities
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Bulk update city for leads
// @route   PUT /api/leads/bulk-update-city
// @access  Private (Admin)
exports.bulkUpdateCity = async (req, res) => {
  try {
    const { oldCity, newCity } = req.body;

    if (!oldCity || !newCity) {
      return res.status(400).json({ success: false, error: "oldCity and newCity are required." });
    }

    const result = await Lead.updateMany(
      { city: oldCity },
      { $set: { city: newCity } }
    );

    res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} leads successfully.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
