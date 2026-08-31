const Lead = require('../models/Lead');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const automationEngine = require('../services/automationEngine');

// Verify Webhook - Meta API
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Missing mode or token');
  }
};

// Handle Incoming Event
exports.handleEvent = async (req, res) => {
  const body = req.body;
  console.log('\n--- Incoming Webhook Payload ---');
  console.log(JSON.stringify(body, null, 2));

  if (body.object === 'instagram' || body.object === 'page') {
    // Return 200 OK immediately so Meta doesn't retry
    res.status(200).send('EVENT_RECEIVED');

    // Process entries asynchronously
    try {
      if (body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          const businessAccountId = entry.id;
          const entryTimeMs = entry.time ? (entry.time.toString().length <= 10 ? entry.time * 1000 : entry.time) : Date.now();
          
          // Case 1: Comments (entry.changes)
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              if (change.field === 'comments') {
                await handleComment(change.value, businessAccountId, entryTimeMs);
              }
            }
          }
          
          // Case 2: DMs (entry.messaging)
          if (entry.messaging && entry.messaging.length > 0) {
            for (const messageEvent of entry.messaging) {
              if (messageEvent.message) {
                await handleDirectMessage(messageEvent, businessAccountId, entryTimeMs);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing webhook event:', err);
    }
  } else {
    res.sendStatus(404);
  }
};

// Simplified handlers for now
async function handleComment(commentData, businessAccountId, timestampMs) {
  const isSelf = (commentData.from && commentData.from.id === businessAccountId);

  if (isSelf) {
    console.log('Received self-comment (manual or automated echo)');
  } else {
    console.log('Received comment:', commentData.text);
    if (!commentData.from || !commentData.from.id) {
      console.log('Ignoring comment payload with missing sender (from.id):', commentData);
      return;
    }
  }

  const senderId = commentData.from ? commentData.from.id : 'unknown';
  const username = commentData.from ? commentData.from.username || 'unknown' : 'unknown';

  const eventData = {
    senderId,
    username,
    text: commentData.text,
    commentId: commentData.id,
    postId: commentData.media ? commentData.media.id : null,
    source: 'comment',
    timestamp: timestampMs
  };
  
  const Comment = require('../models/Comment');
  const Lead = require('../models/Lead');

  if (!isSelf) {
    await automationEngine.processEvent('comment', eventData);
  } else {
    // Pass to automation engine so it can track sequence progress
    await automationEngine.processEvent('admin_replied_comment', eventData);
  }

  // Save comment to database
  let lead = null;
  if (!isSelf) {
    // Ensure lead exists so all comments are saved, even if no sequence triggered
    lead = await automationEngine.ensureLeadExists(senderId, username, 'comment', 'normal');
  } else if (commentData.parent_id) {
    const parentComment = await Comment.findOne({ instagramCommentId: commentData.parent_id });
    if (parentComment) {
      lead = await Lead.findById(parentComment.leadId);
    }
  }

  if (lead) {
    let postThumbnail = null;
    let postCaption = null;

    // Fetch media details from Meta if possible
    if (eventData.postId && process.env.META_PAGE_ACCESS_TOKEN) {
      try {
        const axios = require('axios');
        const url = `https://graph.facebook.com/v21.0/${eventData.postId}?fields=media_url,thumbnail_url,caption&access_token=${process.env.META_PAGE_ACCESS_TOKEN}`;
        const response = await axios.get(url);
        const data = response.data;
        postThumbnail = data.thumbnail_url || data.media_url || null;
        postCaption = data.caption || null;
      } catch (err) {
        console.error('[Webhook Controller] Failed to fetch media details for comment:', err.response?.data || err.message);
      }
    }

    // Store comment idempotently to handle duplicate webhooks
    await Comment.updateOne(
      { instagramCommentId: commentData.id },
      {
        $setOnInsert: {
          senderId: senderId,
          text: commentData.text,
          mediaId: eventData.postId,
          postThumbnail,
          postCaption,
          leadId: lead._id,
          parentCommentId: commentData.parent_id || null,
          direction: isSelf ? 'outbound' : 'inbound',
          isAutomated: false, // Assume manual, automation engine already inserted if automated
          createdAt: new Date(timestampMs || Date.now())
        }
      },
      { upsert: true }
    );
  }
}

async function handleDirectMessage(messageEvent, businessAccountId, fallbackTimestampMs) {
  const senderId = messageEvent.sender.id;
  const isSelf = senderId === businessAccountId;
  
  const recipientId = messageEvent.recipient.id;
  let text = messageEvent.message.text;
  const messageId = messageEvent.message.mid;
  
  if (messageEvent.message.is_deleted) {
    text = '[Message deleted]';
  } else if (!text && messageEvent.message.attachments && messageEvent.message.attachments.length > 0) {
    const type = messageEvent.message.attachments[0].type;
    text = `[Sent an attachment: ${type}]`;
  } else if (!text && messageEvent.message.share) {
    text = '[Shared a Post/Reel]';
  } else if (!text && messageEvent.message.story) {
    text = '[Replied to a Story]';
  } else if (!text && messageEvent.message.sticker_id) {
    text = '[Sent a Sticker]';
  } else if (!text && messageEvent.message.reply_to) {
     text = '[Sent a reply with an attachment]';
  } else if (!text && messageEvent.message.is_unsupported) {
     text = '[Unsupported interactive feature (e.g. Contact Card)]';
  } else if (!text) {
    console.log('[Webhook Debug] Unrecognized DM format:', JSON.stringify(messageEvent.message));
    text = '';
  }
  
  console.log(`Received DM (${isSelf ? 'OUTBOUND' : 'INBOUND'}):`, text);
  
  const leadPlatformId = isSelf ? recipientId : senderId;

  if (!isSelf) {
    const eventData = {
      senderId,
      username: messageEvent.sender.username, // Sometimes not provided in DMs, fallback needed
      text,
      source: 'dm',
      timestamp: messageEvent.timestamp || fallbackTimestampMs
    };
    await automationEngine.processEvent('dm', eventData);
  } else {
    const eventData = {
      senderId: recipientId, // The lead is the recipient
      text,
      source: 'dm',
      timestamp: messageEvent.timestamp || fallbackTimestampMs
    };
    await automationEngine.processEvent('dm_sent', eventData);
  }

  const Lead = require('../models/Lead');
  const Conversation = require('../models/Conversation');
  const Message = require('../models/Message');

  // Find lead to attach conversation
  let lead = null;
  if (!isSelf) {
    // Ensure lead exists so all DMs are saved, even if no sequence triggered
    lead = await automationEngine.ensureLeadExists(leadPlatformId, messageEvent.sender.username || 'unknown', 'dm', 'normal');
  } else {
    lead = await Lead.findOne({ platformUserId: leadPlatformId });
  }
  
  if (lead) {
    let conversation = await Conversation.findOne({ instagramThreadId: `thread_${leadPlatformId}` });
    
    if (!conversation) {
      conversation = await Conversation.create({
        leadId: lead._id,
        instagramThreadId: `thread_${leadPlatformId}`,
      });
    }

    // Store message idempotently to handle duplicate webhooks
    await Message.updateOne(
      { instagramMessageId: messageId },
      {
        $setOnInsert: {
          conversationId: conversation._id,
          senderId: senderId,
          receiverId: recipientId,
          text: text,
          direction: isSelf ? 'outbound' : 'inbound',
          isAutomated: false, // Assume manual, automation engine already inserted if automated
          createdAt: messageEvent.timestamp ? new Date(messageEvent.timestamp) : new Date(fallbackTimestampMs || Date.now())
        }
      },
      { upsert: true }
    );
  }
}
