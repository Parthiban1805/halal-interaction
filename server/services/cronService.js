const cron = require('node-cron');
const Comment = require('../models/Comment');
const Setting = require('../models/Setting');
const Event = require('../models/Event');
const { performBackup } = require('./backupService');

async function calculateWordCloud() {
  console.log('[Cron Job] Starting word cloud calculation...');
  try {
    const comments = await Comment.find({ direction: 'inbound' });
    
    // Stop words to ignore
    const stopWords = new Set([
      'the', 'is', 'in', 'at', 'of', 'on', 'and', 'a', 'to', 'for', 'with', 'it', 'this', 'that', 
      'i', 'you', 'my', 'your', 'we', 'they', 'he', 'she', 'was', 'are', 'as', 'by', 'be', 'or', 
      'an', 'not', 'have', 'has', 'had', 'from', 'but', 'what', 'all', 'were', 'when', 'there', 
      'can', 'so', 'if', 'out', 'up', 'about', 'who', 'which', 'their', 'how', 'will', 'just',
      'like', 'do', 'don', 'get', 'me', 'am'
    ]);

    const wordCounts = {};

    comments.forEach(comment => {
      if (!comment.text) return;
      
      const words = comment.text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      words.forEach(word => {
        if (!stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    const wordCloudData = Object.keys(wordCounts)
      .map(word => ({ text: word, value: wordCounts[word] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50); // top 50 words

    // Save to Setting
    await Setting.findOneAndUpdate(
      { key: 'wordcloud_cache' },
      { value: wordCloudData },
      { upsert: true }
    );
    
    console.log('[Cron Job] Word cloud calculation completed successfully.');
    return wordCloudData;
  } catch (error) {
    console.error('[Cron Job] Error calculating word cloud:', error);
    return null;
  }
}

async function updatePastEvents() {
  console.log('[Cron Job] Checking for past events to complete...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await Event.updateMany(
      { date: { $lt: today }, status: 'Upcoming' },
      { $set: { status: 'Completed' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Cron Job] Successfully updated ${result.modifiedCount} event(s) to Completed.`);
    } else {
      console.log('[Cron Job] No past events to update.');
    }
  } catch (error) {
    console.error('[Cron Job] Error updating past events:', error);
  }
}

function initCronJobs() {
  const chatSyncService = require('./chatSyncService');

  // Run every 2 minute to poll ChatSyncs API for new WhatsApp messages
  cron.schedule('*/2 * * * *', () => {
    if (chatSyncService && typeof chatSyncService.pollChatSyncsMessages === 'function') {
      chatSyncService.pollChatSyncsMessages();
    }
  });

  // Run every 24 hours at midnight
  cron.schedule('0 0 * * *', () => {
    calculateWordCloud();
    updatePastEvents();
  });
  
  // Run every hour at the top of the hour for DB backups
  cron.schedule('0 * * * *', performBackup);

  console.log('[System] Cron jobs initialized.');

  // Run initially on startup to populate cache if missing
  Setting.findOne({ key: 'wordcloud_cache' }).then(cache => {
    if (!cache) {
      console.log('[System] Initializing word cloud cache for the first time...');
      calculateWordCloud();
    }
  }).catch(err => console.error(err));

  // Perform initial database backup on startup
  console.log('[System] Initiating startup database backup...');
  performBackup();

  // Initial event status check
  updatePastEvents();
}

module.exports = { initCronJobs, calculateWordCloud };
