const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Comment = require('../models/Comment');
const AutoReplyRule = require('../models/AutoReplyRule');
const Log = require('../models/Log');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments({ isDeleted: { $ne: true } });
    const wonLeads = await Lead.countDocuments({ stage: 'Won', isDeleted: { $ne: true } });
    const conversionRate = totalLeads === 0 ? 0 : ((wonLeads / totalLeads) * 100).toFixed(1);

    const totalMessages = await Message.countDocuments();
    const automatedMessages = await Message.countDocuments({ isAutomated: true });
    
    const activeWorkflows = await AutoReplyRule.countDocuments({ isActive: true });

    // Recent activity
    const recentActivity = await Log.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('performedBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        totalLeads,
        wonLeads,
        conversionRate,
        totalMessages,
        automatedMessages,
        activeWorkflows,
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getWordCloud = async (req, res) => {
  try {
    const Setting = require('../models/Setting');
    const { calculateWordCloud } = require('../services/cronService');

    let cache = await Setting.findOne({ key: 'wordcloud_cache' });
    
    if (!cache || !cache.value) {
      // If it doesn't exist yet, run the calculation synchronously just this once
      const data = await calculateWordCloud();
      return res.status(200).json(data || []);
    }

    res.status(200).json(cache.value);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
