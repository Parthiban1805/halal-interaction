const axios = require('axios');
const Lead = require('../models/Lead');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const automationEngine = require('./automationEngine');

const CHATSYNCS_BASE_URL = 'https://platform.chatsyncs.com/api/v1';
const DEFAULT_PHONE_NUMBER_ID = process.env.CHATSYNCS_PHONE_NUMBER_ID || '1127014770503697';

class ChatSyncService {
  /**
   * Send a text message via ChatSyncs API
   */
  async sendTextMessage(phoneNumber, text) {
    try {
      const cleanPhone = String(phoneNumber).replace(/[^\d]/g, '');
      const token = process.env.CHATSYNCS_API_KEY;

      const bodyParams = new URLSearchParams();
      bodyParams.append('apiToken', token);
      bodyParams.append('phone_number_id', DEFAULT_PHONE_NUMBER_ID);
      bodyParams.append('phone_number', cleanPhone);
      bodyParams.append('message', text.trim());

      const response = await axios.post(
        `${CHATSYNCS_BASE_URL}/whatsapp/send`,
        bodyParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const result = response.data;
      if (result.status !== '1') {
        throw new Error(result.message || 'Failed to send message via ChatSyncs');
      }

      return {
        success: true,
        messageId: result.wa_message_id
      };
    } catch (error) {
      console.error('[ChatSyncService] Error sending message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Handle incoming Webhook from ChatSyncs
   */
  async handleWebhook(body) {
    console.log('\n--- Incoming ChatSyncs Webhook Payload ---');
    console.log(JSON.stringify(body, null, 2));

    try {
      const items = Array.isArray(body) ? body : [body];

      for (const item of items) {
        let senderPhone, text, messageId, timestampMs, name;
        
        // 1. ChatSyncs Custom Format
        if (item.chat_id) {
          senderPhone = String(item.chat_id).replace(/[^\d]/g, '');
          name = item.first_name || item.subscriber_name || senderPhone;
          const messageText = item.user_message || item.message || item.text || item.body;
          const hasMedia = item.media_url || item.image || item.audio || item.document || item.video;
          
          if (!messageText && !hasMedia) {
             const statusType = item.message_status || item.status || 'delivered';
             console.log(`[ChatSyncService] Delivery Status Update: ${senderPhone} | Status: ${statusType}`);
             continue; // Skip delivery receipts
          }

          text = messageText || '';
          if (!text && hasMedia) {
            if (item.image) text = '📷 [Image]';
            else if (item.audio) text = '🎤 [Voice/Audio]';
            else if (item.document) text = '📄 [Document]';
            else if (item.video) text = '🎥 [Video]';
            else text = '📎 [Attachment]';
          }

          messageId = item.wa_message_id || `cs_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          timestampMs = item.timestamp ? parseInt(item.timestamp) : Date.now(); // ChatSyncs format might not pass timestamp directly, fallback to now
          
          const direction = item.direction || 'incoming';
          if (direction === 'outgoing') continue; // We only process incoming webhooks for lead creation
        } 
        // 2. Fallback to Meta-like raw format
        else if (item.entry && item.entry[0] && item.entry[0].changes) {
          const messageData = item.entry[0].changes[0].value.messages?.[0];
          const contactData = item.entry[0].changes[0].value.contacts?.[0];
          if (!messageData) continue;
          
          senderPhone = String(messageData.from).replace(/[^\d]/g, '');
          text = messageData.text?.body;
          
          if (!text) {
             if (messageData.type === 'image') text = '📷 [Image]';
             else if (messageData.type === 'audio') text = '🎤 [Voice/Audio]';
             else if (messageData.type === 'document') text = '📄 [Document]';
             else if (messageData.type === 'video') text = '🎥 [Video]';
             else text = `[${messageData.type}]`;
          }

          messageId = messageData.id;
          timestampMs = messageData.timestamp ? parseInt(messageData.timestamp) * 1000 : Date.now();
          name = contactData?.profile?.name || senderPhone;
        }

        if (!senderPhone) {
          continue;
        }

        const eventData = {
          senderId: senderPhone,
          username: name || 'unknown',
          text: text || '[WhatsApp Message]',
          source: 'whatsapp',
          timestamp: timestampMs
        };

        // Ensure lead exists BEFORE automation engine runs
        let lead = await Lead.findOne({ platformUserId: senderPhone });
        
        if (!lead) {
            lead = await Lead.create({
                platformUserId: senderPhone,
                username: name,
                platform: 'whatsapp',
                name: name !== senderPhone ? name : null,
                phone: senderPhone,
                source: 'whatsapp',
                status: 'New',
                isPipelineLead: true
            });
            console.log(`[ChatSyncService] Created new WhatsApp lead: ${lead._id}`);
        } else {
            let changed = false;
            // Handle if the lead was previously an IG lead that migrated, or just missing properties
            if (lead.platform !== 'whatsapp') {
                lead.platform = 'whatsapp';
                changed = true;
            }
            if (!lead.isPipelineLead) {
                lead.isPipelineLead = true;
                changed = true;
            }
            if (!lead.phone || lead.phone !== senderPhone) {
                lead.phone = senderPhone;
                changed = true;
            }
            if (name && name !== senderPhone && name !== 'unknown' && (!lead.name || lead.name === lead.phone || lead.name === 'unknown')) {
                lead.name = name;
                changed = true;
            }
            if (changed) {
                await lead.save();
            }
        }

        // Automate handling
        await automationEngine.processEvent('dm', eventData);

        // Find or create conversation
        const threadId = `wa_${senderPhone}`;
        let conversation = await Conversation.findOne({ whatsappThreadId: threadId });
        
        if (!conversation) {
          conversation = await Conversation.create({
            leadId: lead._id,
            whatsappThreadId: threadId,
          });
        }

        // Save message idempotently (this might be a placeholder if text is empty, syncLeadHistory will fetch real text)
        await Message.updateOne(
          { whatsappMessageId: messageId },
          {
            $setOnInsert: {
              conversationId: conversation._id,
              senderId: senderPhone,
              receiverId: 'system',
              text: text || '[Media/Attachment]',
              direction: 'inbound',
              isAutomated: false,
              createdAt: new Date(timestampMs)
            }
          },
          { upsert: true }
        );

        // Fetch the past ChatSyncs history asynchronously on EVERY webhook to ensure missing texts are populated
        this.syncLeadHistory(senderPhone, conversation._id).catch(err => console.error('[ChatSyncService] Background history sync failed:', err));
      }
    } catch (err) {
      console.error('[ChatSyncService] Error processing webhook:', err);
    }
  }

  /**
   * Fetch historical messages from ChatSyncs and import them into the Conversation
   */
  async syncLeadHistory(phone, conversationId) {
    try {
      const token = process.env.CHATSYNCS_API_KEY;
      const cleanPhone = String(phone).replace(/[^\d]/g, '');
      const url = `${CHATSYNCS_BASE_URL}/whatsapp/get/conversation?apiToken=${encodeURIComponent(token)}&phone_number_id=${DEFAULT_PHONE_NUMBER_ID}&phone_number=${cleanPhone}&limit=50&offset=0`;
      
      const res = await axios.get(url);
      const data = res.data;
      
      if (data && data.status === '1') {
        const convItems = Array.isArray(data.data) ? data.data : (Array.isArray(data.message) ? data.message : []);
        
        if (convItems.length > 0) {
          console.log(`[ChatSyncService] Syncing ${convItems.length} past messages for ${cleanPhone}...`);
          
          for (const item of convItems) {
            const msgId = item.wa_message_id || `hist_${item.id}`;
            const isIncoming = item.sender === 'user';
            
            let msgBody = '';
            let parsedTimestamp = item.conversation_time ? new Date(item.conversation_time).getTime() : Date.now();

            if (item.message_content) {
              try {
                const contentObj = typeof item.message_content === 'string' ? JSON.parse(item.message_content) : item.message_content;
                const val = contentObj?.entry?.[0]?.changes?.[0]?.value;
                if (val) {
                  if (isIncoming && val.messages?.[0]) {
                    const m = val.messages[0];
                    msgBody = m.text?.body || (m[m.type]?.caption ? `[${m.type}]: ${m[m.type].caption}` : `[${m.type} message]`);
                    if (m.timestamp) parsedTimestamp = parseInt(m.timestamp) * 1000;
                  } else if (!isIncoming) {
                    const echo = val.message_echoes?.[0] || val.messages?.[0];
                    if (echo) {
                      msgBody = echo.text?.body || (echo[echo.type]?.caption ? `[${echo.type}]: ${echo[echo.type].caption}` : `[${echo.type} message]`);
                      if (echo.timestamp) parsedTimestamp = parseInt(echo.timestamp) * 1000;
                    }
                  }
                }
              } catch (e) {
                msgBody = item.message_content;
              }
            }

            if (!msgBody) {
              msgBody = item.user_message || item.message || '[Message]';
            }

            const updateDoc = {
              $setOnInsert: {
                conversationId: conversationId,
                senderId: isIncoming ? cleanPhone : 'system',
                receiverId: isIncoming ? 'system' : cleanPhone,
                direction: isIncoming ? 'inbound' : 'outbound',
                isAutomated: false,
                createdAt: new Date(parsedTimestamp)
              }
            };

            if (msgBody && msgBody !== '[Message]') {
              updateDoc.$set = { text: msgBody };
            } else {
              updateDoc.$setOnInsert.text = msgBody;
            }

            await Message.updateOne(
              { whatsappMessageId: msgId },
              updateDoc,
              { upsert: true }
            );
          }
        }
      }
    } catch (err) {
      console.error(`[ChatSyncService] Failed to sync history for ${phone}:`, err.message);
    }
  }

  /**
   * Poll ChatSyncs API for new messages (to avoid webhook costs)
   */
  async pollChatSyncsMessages() {
    try {
      const token = process.env.CHATSYNCS_API_KEY;
      if (!token) return;
      
      const Setting = require('../models/Setting');
      const Message = require('../models/Message');

      const mapSetting = await Setting.findOne({ key: 'chatsyncs_last_synced_map' });
      const lastSyncedMap = mapSetting && mapSetting.value ? mapSetting.value : {};

      // 1. Fetch top recently active contacts (Sorted by latest message)
      const listUrl = `${CHATSYNCS_BASE_URL}/whatsapp/subscriber/list?apiToken=${encodeURIComponent(token)}&phone_number_id=${DEFAULT_PHONE_NUMBER_ID}&limit=15&offset=0&orderBy=1`;
      
      const res = await axios.get(listUrl, { timeout: 8000 });
      if (!res.data || res.data.status !== '1') return;

      const subscribers = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data.message) ? res.data.message : []);
      if (!subscribers.length) return;

      let mapUpdated = false;

      for (const sub of subscribers) {
        const chatId = String(sub.chat_id || sub.phone_number || sub.subscriber_id || '').replace(/[^\d]/g, '');
        if (!chatId) continue;

        const subLastTime = sub.last_message_time || '';
        const prevTime = lastSyncedMap[chatId];

        // Smart Diff: If no new message since last check, SKIP!
        if (prevTime && prevTime === subLastTime) continue;

        console.log(`[ChatSyncService] 📥 Poller found new activity for ${chatId}`);

        // 2. Fetch conversation for the contact with new messages
        const convUrl = `${CHATSYNCS_BASE_URL}/whatsapp/get/conversation?apiToken=${encodeURIComponent(token)}&phone_number_id=${DEFAULT_PHONE_NUMBER_ID}&phone_number=${chatId}&limit=10&offset=0`;
        const convRes = await axios.get(convUrl, { timeout: 8000 });
        
        if (!convRes.data || convRes.data.status !== '1') continue;

        const items = Array.isArray(convRes.data.data) ? convRes.data.data : (Array.isArray(convRes.data.message) ? convRes.data.message : []);
        
        // Reverse to process oldest to newest (to ensure automation triggers in order)
        const reversedItems = [...items].reverse();

        for (const item of reversedItems) {
          let msgId = item.wa_message_id || `cs_${item.id || Date.now()}`;

          // Check if we already processed this EXACT message to prevent duplicate automation!
          const exists = await Message.exists({ whatsappMessageId: msgId });
          if (exists) continue;

          // Process Customer Incoming messages via webhook handler
          if (item.sender === 'user') {
            let msgBody = item.user_message || item.message;
            let msgTimestamp = item.conversation_time ? new Date(item.conversation_time + 'Z').getTime() : Date.now();

            if (!msgBody && item.message_content) {
              try {
                const raw = typeof item.message_content === 'string' ? JSON.parse(item.message_content) : item.message_content;
                const entry = raw?.entry?.[0]?.changes?.[0]?.value;
                if (entry?.messages?.length > 0) {
                  const m = entry.messages[0];
                  msgId = m.id || msgId; // Use actual meta ID if available
                  msgBody = m.text?.body || (m.type ? `[${m.type}]` : '[Message]');
                  if (m.timestamp) msgTimestamp = parseInt(m.timestamp) * 1000;
                }
              } catch(e) {}
            }

            const fakeWebhook = {
              ...item, // include everything the API sent
              chat_id: chatId,
              first_name: sub.first_name,
              wa_message_id: msgId,
              user_message: msgBody || '[Media/Message]',
              direction: 'incoming',
              timestamp: msgTimestamp
            };
            
            console.log(`[ChatSyncService] 🤖 Poller injecting fake webhook for ${chatId}`);
            await this.handleWebhook(fakeWebhook);
          }
        }

        // 3. Update Sync Map
        lastSyncedMap[chatId] = subLastTime;
        mapUpdated = true;
      }

      if (mapUpdated) {
        await Setting.findOneAndUpdate(
          { key: 'chatsyncs_last_synced_map' },
          { value: lastSyncedMap },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error('[ChatSyncService] Error polling messages:', err.message);
    }
  }
}

module.exports = new ChatSyncService();
