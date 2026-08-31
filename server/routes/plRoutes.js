const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const MembershipTransaction = require('../models/MembershipTransaction');
const EventTransaction = require('../models/EventTransaction');
const AgentPayout = require('../models/AgentPayout');
const EventExpense = require('../models/EventExpense');
const ExternalExpense = require('../models/ExternalExpense');

const router = express.Router();

router.use(protect);

// Reusable timezone helper
const getISTBoundaries = (period, startDate, endDate) => {
  let startLimit = null;
  let endLimit = null;
  
  const getISTTime = (date = new Date()) => new Date(date.getTime() + (330 * 60 * 1000));
  const fromISTTime = (istDate) => new Date(istDate.getTime() - (330 * 60 * 1000));

  if (startDate && endDate) {
    const startIST = getISTTime(new Date(startDate));
    startIST.setUTCHours(0, 0, 0, 0);
    startLimit = fromISTTime(startIST);
    
    const endIST = getISTTime(new Date(endDate));
    endIST.setUTCHours(23, 59, 59, 999);
    endLimit = fromISTTime(endIST);
  } else if (period) {
    const nowIST = getISTTime();
    endLimit = new Date(); // default

    if (period === '24h') {
      startLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (period === 'all' || period === 'all_time') {
      startLimit = null;
      endLimit = null;
    } else if (period === 'today') {
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
    } else if (period === 'yesterday') {
      nowIST.setUTCDate(nowIST.getUTCDate() - 1);
      const startYesterday = new Date(nowIST);
      startYesterday.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(startYesterday);
      const endYesterday = new Date(nowIST);
      endYesterday.setUTCHours(23, 59, 59, 999);
      endLimit = fromISTTime(endYesterday);
    } else if (period === 'this_week') {
      const day = nowIST.getUTCDay() || 7; 
      nowIST.setUTCDate(nowIST.getUTCDate() - day + 1);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
    } else if (period === 'last_week') {
      const day = nowIST.getUTCDay() || 7; 
      nowIST.setUTCDate(nowIST.getUTCDate() - day - 6);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
      const endLastWeek = new Date(nowIST);
      endLastWeek.setUTCDate(endLastWeek.getUTCDate() + 6);
      endLastWeek.setUTCHours(23, 59, 59, 999);
      endLimit = fromISTTime(endLastWeek);
    } else if (period === 'this_month') {
      nowIST.setUTCDate(1);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
    } else if (period === 'last_month') {
      nowIST.setUTCMonth(nowIST.getUTCMonth() - 1);
      nowIST.setUTCDate(1);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
      const endLastMonth = new Date(nowIST);
      endLastMonth.setUTCMonth(endLastMonth.getUTCMonth() + 1);
      endLastMonth.setUTCDate(0); 
      endLastMonth.setUTCHours(23, 59, 59, 999);
      endLimit = fromISTTime(endLastMonth);
    } else if (period === 'this_year') {
      nowIST.setUTCMonth(0, 1);
      nowIST.setUTCHours(0, 0, 0, 0);
      startLimit = fromISTTime(nowIST);
    } else {
      const daysNum = parseInt(period, 10);
      if (!isNaN(daysNum)) {
        nowIST.setUTCDate(nowIST.getUTCDate() - daysNum + 1);
        nowIST.setUTCHours(0, 0, 0, 0);
        startLimit = fromISTTime(nowIST);
      }
    }
  }
  
  return { startLimit, endLimit };
};

const getMonthsBetween = (start, end) => {
  if (!start) return null; // all time -> we'll handle this differently
  
  const endLimit = end || new Date();
  
  const getISTTime = (date) => new Date(date.getTime() + (330 * 60 * 1000));
  const s = getISTTime(start);
  const e = getISTTime(endLimit);
  
  const periods = [];
  let curr = new Date(s.getFullYear(), s.getMonth(), 1);
  const endMonth = new Date(e.getFullYear(), e.getMonth(), 1);
  
  while (curr <= endMonth) {
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    periods.push(`${year}-${month}`);
    curr.setMonth(curr.getMonth() + 1);
  }
  
  return periods;
};

// GET /api/pl/summary
router.get('/summary', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const { startLimit, endLimit } = getISTBoundaries(period, startDate, endDate);
    
    let dateFilter = {};
    if (startLimit || endLimit) {
      dateFilter = {};
      if (startLimit) dateFilter.$gte = startLimit;
      if (endLimit) dateFilter.$lte = endLimit;
    }

    // 1. Memberships
    const membershipQuery = dateFilter.$gte ? { transactionDate: dateFilter } : {};
    const memberships = await MembershipTransaction.find(membershipQuery);
    
    let newMembershipRevenue = 0;
    let renewalMembershipRevenue = 0;
    
    memberships.forEach(m => {
      const amountExcGst = (m.amountPaid || 0) / 1.18;
      if (m.isRenewal) {
        renewalMembershipRevenue += amountExcGst;
      } else {
        newMembershipRevenue += amountExcGst;
      }
    });

    // 2. Events Revenue
    const eventTransactionQuery = dateFilter.$gte ? { transactionDate: dateFilter } : {};
    const eventTransactions = await EventTransaction.find(eventTransactionQuery);
    const eventRegistrationRevenue = eventTransactions.reduce((acc, curr) => acc + ((curr.amountPaid || 0) / 1.18), 0);

    // 3. Salaries & Incentives
    const payoutPeriods = getMonthsBetween(startLimit, endLimit);
    const payoutQuery = payoutPeriods ? { period: { $in: payoutPeriods } } : {};
    const payouts = await AgentPayout.find(payoutQuery);
    
    let totalSalaries = 0;
    let totalIncentives = 0;
    payouts.forEach(p => {
      totalSalaries += (p.baseSalarySnapshot || 0);
      totalIncentives += (p.incentiveEarned || 0);
    });

    // 4. Event Expenses
    const eventExpenseQuery = dateFilter.$gte ? { date: dateFilter } : {};
    const eventExpensesDocs = await EventExpense.find(eventExpenseQuery);
    const eventExpenses = eventExpensesDocs.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // 5. External Expenses
    const externalExpenseQuery = dateFilter.$gte ? { date: dateFilter } : {};
    const externalExpensesDocs = await ExternalExpense.find(externalExpenseQuery).sort({ date: -1 }).populate('createdBy', 'name');
    const externalExpensesTotal = externalExpensesDocs.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const totalRevenue = newMembershipRevenue + renewalMembershipRevenue + eventRegistrationRevenue;
    const totalExpense = totalSalaries + totalIncentives + eventExpenses + externalExpensesTotal;
    const netProfit = totalRevenue - totalExpense;

    res.status(200).json({
      success: true,
      data: {
        totals: {
          revenue: totalRevenue,
          expense: totalExpense,
          netProfit
        },
        revenueBreakdown: [
          { category: 'New Membership Revenue', amount: newMembershipRevenue },
          { category: 'Membership Renewal Revenue', amount: renewalMembershipRevenue },
          { category: 'Event Registration', amount: eventRegistrationRevenue }
        ],
        expenseBreakdown: [
          { category: 'Salaries', amount: totalSalaries },
          { category: 'Incentives', amount: totalIncentives },
          { category: 'Event Expenses', amount: eventExpenses },
          { category: 'External Expenses', amount: externalExpensesTotal }
        ],
        externalExpensesList: externalExpensesDocs
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pl/external-expenses
router.post('/external-expenses', async (req, res) => {
  try {
    const { title, amount, date, description, category } = req.body;
    
    if (!title || !amount || !date || !category) {
      return res.status(400).json({ success: false, error: 'Title, amount, date, and category are required.' });
    }

    const expense = await ExternalExpense.create({
      title,
      amount,
      date,
      description,
      category,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/pl/external-expenses/:id
router.put('/external-expenses/:id', async (req, res) => {
  try {
    const { title, amount, date, description, category } = req.body;
    
    if (!title || !amount || !date || !category) {
      return res.status(400).json({ success: false, error: 'Title, amount, date, and category are required.' });
    }

    const expense = await ExternalExpense.findByIdAndUpdate(
      req.params.id, 
      { title, amount, date, description, category }, 
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    
    res.status(200).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/pl/external-expenses/:id
router.delete('/external-expenses/:id', async (req, res) => {
  try {
    const expense = await ExternalExpense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
