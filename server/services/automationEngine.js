const Setting = require('../models/Setting');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Log = require('../models/Log');
const axios = require('axios');

class AutomationEngine {
  async processEvent(eventType, eventData) {
    console.log(`[Automation Engine] Processing event: ${eventType}`);
    try {
      const settingDoc = await Setting.findOne({ key: 'global_settings' });
      const settings = settingDoc ? settingDoc.value : {};
      
      let lead = await Lead.findOne({ platformUserId: eventData.senderId });
      
      // --- GLOBAL PHONE NUMBER DETECTION ---
      // If this is an inbound message and it contains a valid phone number, extract it immediately.
      // This ensures that even if a user is stuck in a generic path (or not in one), their phone number
      // is always captured and they are upgraded to a Hot Lead.
      const isInboundDMOrComment = (eventType === 'dm' || eventType === 'comment') && eventData.text;
      if (isInboundDMOrComment) {
        const cleanText = eventData.text.replace(/[\s\-\.\(\)]/g, ''); 
        const phoneMatch = cleanText.match(/(\+?\d{7,15})/);
        
        if (phoneMatch) {
          eventData._extractedPhone = phoneMatch[1]; // Save for later steps
          
          if (lead) {
            let needsSave = false;
            if (lead.priority !== 'super' && lead.priority !== 'hot') {
              lead.priority = 'hot'; // Automatically upgrade to Hot Lead
              needsSave = true;
              console.log(`[Automation Engine] Lead ${lead.username} automatically upgraded to Hot Lead (phone detected)`);
            }
            if (needsSave) await lead.save();
          }
        }
      }
      
      // If the event is outbound (admin_replied_comment or dm_sent), we ONLY care about it 
      // if we are actively tracking a sequence. It should NEVER start a new sequence or hit global fallbacks.
      const isOutbound = eventType === 'admin_replied_comment' || eventType === 'dm_sent';

      let matchedPath = null;
      let matchedStep = null;
      let isAdvancingSequence = false;

      // 1. Check if Lead is already in an active sequence
      if (lead && lead.activePathId && settings.leadConversionLogic === 'sequence') {
        const activePath = settings.leadConversionRules?.find(r => r.id === lead.activePathId && r.isActive);
        if (activePath && activePath.sequence) {
          const nextStepIndex = lead.activePathStepIndex + 1;
          if (nextStepIndex < activePath.sequence.length) {
            const nextStep = activePath.sequence[nextStepIndex];
            
            // Map eventType to step type
            const matchesNext = (
              (eventType === 'comment' && nextStep.type === 'comment_received') ||
              (eventType === 'dm' && nextStep.type === 'dm_received') ||
              (eventType === 'admin_replied_comment' && nextStep.type === 'admin_replied_comment') ||
              (eventType === 'dm_sent' && nextStep.type === 'dm_sent')
            );
            
            if (matchesNext && this.evaluateConditions(nextStep, eventData)) {
              matchedPath = activePath;
              matchedStep = nextStep;
              isAdvancingSequence = true;
              lead.activePathStepIndex = nextStepIndex;
              lead.isPipelineLead = true;
            }
          }
        }
      }

      // 2. If not advancing a sequence, and it's an inbound event, see if it triggers a NEW sequence
      // Skip if lead is already in an active path (they should stay parked until they meet the next step's condition)
      if (!isAdvancingSequence && !isOutbound && !(lead && lead.activePathId) && settings.leadConversionLogic === 'sequence' && settings.leadConversionRules) {
        
        // Sort rules so that specific conditions (like phone detection or keywords) are evaluated first.
        // If specificity is the same, longer sequences take precedence.
        const sortedRules = [...settings.leadConversionRules].sort((a, b) => {
          const aFirst = a.sequence && a.sequence.length > 0 ? a.sequence[0] : null;
          const bFirst = b.sequence && b.sequence.length > 0 ? b.sequence[0] : null;
          
          if (!aFirst && !bFirst) return 0;
          if (!aFirst) return 1;
          if (!bFirst) return -1;
          
          const getSpecificity = (step) => {
            if (step.matchType === 'contains_phone') return 3;
            if (step.keywords && step.keywords.trim() !== '') return 2;
            return 1; // catch-all
          };
          
          const aSpec = getSpecificity(aFirst);
          const bSpec = getSpecificity(bFirst);
          
          if (aSpec !== bSpec) return bSpec - aSpec; // Higher specificity first
          
          return (b.sequence?.length || 0) - (a.sequence?.length || 0); // Longer sequence first
        });

        for (const path of sortedRules) {
          if (path.isActive === false) continue;
          
          if (path.sequence && path.sequence.length > 0) {
            const firstStep = path.sequence[0];
            
            if ((eventType === 'comment' && firstStep.type === 'comment_received') ||
                (eventType === 'dm' && firstStep.type === 'dm_received')) {
              
              if (this.evaluateConditions(firstStep, eventData)) {
                matchedPath = path;
                matchedStep = firstStep;
                
                // Set the active path on the lead
                if (!lead) {
                  // We need to create the lead now so we can save the path state
                  lead = await this.ensureLeadExists(eventData.senderId, eventData.username, eventData.source || 'automation', 'normal');
                }
                lead.activePathId = path.id;
                lead.activePathStepIndex = 0;
                lead.isPipelineLead = true;
                break; // Stop at first matched path
              }
            }
          }
        }
      }

      if (matchedPath && matchedStep) {
        if (!isAdvancingSequence) {
           console.log(`[Automation Engine] New Path triggered: ${matchedPath.id}`);
        } else {
           console.log(`[Automation Engine] Advancing Path ${matchedPath.id} to step ${lead.activePathStepIndex}`);
        }
        
        await Log.create({
          action: isAdvancingSequence ? `Path Advanced: ${matchedPath.id} (Step ${lead.activePathStepIndex})` : `Path Triggered: ${matchedPath.id}`,
          entityType: 'System',
          details: { pathId: matchedPath.id, stepIndex: lead.activePathStepIndex }
        });

        await this.executeRuleActions(matchedPath, matchedStep, eventData, settings, lead);
      } else if (!isOutbound) {
        // No specific path matched, execute global fallbacks (only for INBOUND)
        console.log(`[Automation Engine] No specific path matched. Executing global fallbacks.`);
        await this.executeGlobalFallbacks(eventType, eventData, settings);
      }

    } catch (error) {
      console.error('[Automation Engine] Error processing event:', error);
    }
  }


  evaluateConditions(step, eventData) {
    // Check target posts (only for comments)
    if (eventData.source === 'comment' && step.postIds && step.postIds.length > 0) {
      if (!step.postIds.includes(eventData.postId)) {
        return false;
      }
    }

    // Handle 'contains_phone' match type
    if (step.matchType === 'contains_phone') {
      const text = (eventData.text || '').replace(/[\s\-\.\(\)]/g, ''); // strip spaces, dashes, dots, parentheses
      const phoneRegex = /(\+?\d{7,15})/;
      const match = text.match(phoneRegex);
      if (match) {
        // Store the extracted phone number on eventData so executeRuleActions can save it
        eventData._extractedPhone = match[1];
        return true;
      }
      return false;
    }

    // Check keywords (default matchType)
    if (!step.keywords || step.keywords.trim() === '') return true; // Empty means catch-all

    const text = (eventData.text || '').toLowerCase().trim();
    const keywordsList = step.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    
    // Default to contains
    return keywordsList.some(kw => text.includes(kw));
  }

  async executeRuleActions(path, step, eventData, settings, lead) {
    const senderId = eventData.senderId;
    const isHot = path.isHot === true;
    
    let autoAdvanced = false;

    // Extracted phone is no longer saved automatically to lead.phone

    // Check if this is the final step in the sequence
    const isFinalStep = lead.activePathStepIndex === (path.sequence.length - 1);

    if (isFinalStep) {
      console.log(`[Automation Engine] Path ${path.id} completed! Upgrading priority.`);
      if (isHot) {
        lead.priority = 'hot';
      } else if (lead.priority !== 'hot' && lead.priority !== 'super') {
        lead.priority = 'normal';
      }
      lead.activePathId = null; // Clear path so they can trigger new ones
      lead.activePathStepIndex = 0;
      await lead.save();
    } else {
      // Just save the progression state
      await lead.save();
    }

    // 2. Execute auto replies if this is an INBOUND step
    if (eventData.source === 'comment') {
      const publicReplyText = step.autoReplyText || (settings.autoCommentReply ? settings.commentReplyText : null);
      const privateReplyText = step.dmAutoReplyText || (settings.dmOnComment ? settings.dmOnCommentText : null);

      if (publicReplyText) {
        const resolvedText = publicReplyText.replace(/{username}/g, `@${eventData.username}`);
        await this.sendMetaCommentReply(eventData.commentId, resolvedText, senderId, eventData.timestamp);
        
        // If we just sent an automated public reply, and the next step is 'admin_replied_comment', we auto-advance!
        if (!isFinalStep && path.sequence[lead.activePathStepIndex + 1].type === 'admin_replied_comment') {
          console.log(`[Automation Engine] Auto-advancing to admin_replied_comment since bot just replied`);
          lead.activePathStepIndex += 1;
          autoAdvanced = true;
          await lead.save();
        }
      }

      if (privateReplyText) {
        const resolvedText = privateReplyText.replace(/{username}/g, `@${eventData.username}`);
        const mid = await this.sendMetaDirectMessage(senderId, eventData.commentId, resolvedText);
        await this.logAutomatedMessage(senderId, resolvedText, mid, eventData.timestamp);
        
        // If we sent a DM reply, and the next step is 'dm_sent', we auto-advance!
        const nextIdx = lead.activePathStepIndex + 1;
        if (!isFinalStep && path.sequence[nextIdx] && path.sequence[nextIdx].type === 'dm_sent') {
          console.log(`[Automation Engine] Auto-advancing to dm_sent since bot just sent DM`);
          lead.activePathStepIndex += 1;
          autoAdvanced = true;
          await lead.save();
        }
      }
    } else if (eventData.source === 'dm' && step.type === 'dm_received') {
      const replyText = step.autoReplyText || (settings.autoDMReply ? settings.dmReplyText : null);
      if (replyText) {
        const resolvedText = replyText.replace(/{username}/g, `@${eventData.username}`);
        const mid = await this.sendMetaDirectMessage(senderId, null, resolvedText);
        await this.logAutomatedMessage(senderId, resolvedText, mid, eventData.timestamp);
        
        const nextIdx = lead.activePathStepIndex + 1;
        if (!isFinalStep && path.sequence[nextIdx] && path.sequence[nextIdx].type === 'dm_sent') {
          console.log(`[Automation Engine] Auto-advancing to dm_sent since bot just sent DM`);
          lead.activePathStepIndex += 1;
          autoAdvanced = true;
          await lead.save();
        }
      }
    }
    
    // If we auto-advanced, check if the NEW step is the final step
    if (autoAdvanced) {
      const nowFinal = lead.activePathStepIndex === (path.sequence.length - 1);
      if (nowFinal) {
        console.log(`[Automation Engine] Path ${path.id} completed via auto-advancement! Upgrading priority.`);
        lead.priority = isHot ? 'hot' : 'normal';
        lead.activePathId = null; 
        lead.activePathStepIndex = 0;
        await lead.save();
      }
    }
  }

  async executeGlobalFallbacks(eventType, eventData, settings) {
    const senderId = eventData.senderId;

    if (eventType === 'comment') {
      if (true) {
        if (settings.autoCommentReply && settings.commentReplyText) {
          const resolvedText = settings.commentReplyText.replace(/{username}/g, `@${eventData.username}`);
          await this.sendMetaCommentReply(eventData.commentId, resolvedText, senderId, eventData.timestamp);
        }
        
        if (settings.dmOnComment && settings.dmOnCommentText) {
          const resolvedText = settings.dmOnCommentText.replace(/{username}/g, `@${eventData.username}`);
          const mid = await this.sendMetaDirectMessage(senderId, eventData.commentId, resolvedText);
          await this.logAutomatedMessage(senderId, resolvedText, mid, eventData.timestamp);
        }
      }
    } else if (eventType === 'dm') {
      if (settings.autoDMReply && settings.dmReplyText) {
        const resolvedText = settings.dmReplyText.replace(/{username}/g, `@${eventData.username}`);
        const mid = await this.sendMetaDirectMessage(senderId, null, resolvedText);
        await this.logAutomatedMessage(senderId, resolvedText, mid, eventData.timestamp);
      }
    }
  }

  async sendMetaDirectMessage(recipientId, commentId, text) {
    try {
      const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
      if (!pageToken) {
         console.warn('[Automation Engine] META_PAGE_ACCESS_TOKEN not configured. Skipping DM.');
         return;
      }
      
      const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageToken}`;
      
      const payload = { message: { text } };
      if (commentId) {
        // Use Private Replies API which bypasses Advanced Access restrictions
        payload.recipient = { comment_id: commentId };
      } else {
        // Standard DM (requires Advanced Access or active 24h window)
        payload.recipient = { id: recipientId };
      }

      const response = await axios.post(url, payload);
      console.log(`[Automation Engine] Successfully sent DM to ${recipientId}`);
      return response.data?.message_id;
    } catch (error) {
      console.error(`[Automation Engine] Failed to send Meta DM:`, error.response?.data || error.message);
      return null;
    }
  }

  async sendMetaCommentReply(commentId, text, instagramId, incomingTimestampMs) {
    try {
      if (!commentId) {
         console.warn('[Automation Engine] Missing commentId. Cannot reply.');
         return;
      }
      const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
      if (!pageToken) {
         console.warn('[Automation Engine] META_PAGE_ACCESS_TOKEN not configured. Skipping comment reply.');
         return;
      }
      
      const url = `https://graph.facebook.com/v21.0/${commentId}/replies?access_token=${pageToken}`;
      const response = await axios.post(url, { message: text });
      console.log(`[Automation Engine] Successfully replied to comment ${commentId}`);
      
      // Log the automated reply in the database
      if (instagramId) {
        const Comment = require('../models/Comment');
        const Lead = require('../models/Lead');
        const lead = await Lead.findOne({ platformUserId: instagramId });
        if (lead) {
          await Comment.updateOne(
            { instagramCommentId: response.data?.id || `auto_${Date.now()}` },
            {
              $setOnInsert: {
                senderId: 'system',
                text: text,
                direction: 'outbound',
                isAutomated: true,
                parentCommentId: commentId,
                leadId: lead._id,
                createdAt: incomingTimestampMs ? new Date(incomingTimestampMs + 1000) : Date.now()
              }
            },
            { upsert: true }
          );
        }
      }
    } catch (error) {
      console.error(`[Automation Engine] Failed to reply to Meta comment:`, error.response?.data || error.message);
    }
  }

  async ensureLeadExists(instagramId, username, source, priority = 'normal') {
    let lead = await Lead.findOne({ platformUserId: instagramId });
    if (!lead) {
      try {
        lead = await Lead.create({
          platformUserId: instagramId,
          username: username && username !== 'unknown' ? username : `IG_User_${instagramId}`,
          source,
          status: 'New',
          priority: priority
        });
        return lead;
      } catch (error) {
        if (error.code === 11000) {
          lead = await Lead.findOne({ platformUserId: instagramId });
        } else {
          throw error;
        }
      }
    }
    
    if (lead) {
      let updated = false;
      
      if (priority === 'hot' && lead.priority !== 'hot') {
        lead.priority = 'hot';
        updated = true;
      }
      
      if (username && username !== 'unknown' && (!lead.username || lead.username.startsWith('IG_User_') || lead.username === 'unknown')) {
        lead.username = username;
        updated = true;
      }
      
      if (updated) {
        await lead.save();
      }
    }
    return lead;
  }

  async logAutomatedMessage(instagramId, text, messageId, incomingTimestampMs) {
    const lead = await Lead.findOne({ platformUserId: instagramId });
    if (!lead) return;

    let conversation = await Conversation.findOne({ instagramThreadId: `thread_${instagramId}` });
    if (!conversation) {
      conversation = await Conversation.create({
        leadId: lead._id,
        instagramThreadId: `thread_${instagramId}`,
      });
    }

    await Message.updateOne(
      { instagramMessageId: messageId || `auto_${Date.now()}` },
      {
        $setOnInsert: {
          conversationId: conversation._id,
          senderId: 'system',
          receiverId: instagramId,
          text: text,
          direction: 'outbound',
          isAutomated: true,
          createdAt: incomingTimestampMs ? new Date(incomingTimestampMs + 1000) : Date.now()
        }
      },
      { upsert: true }
    );
  }
}

module.exports = new AutomationEngine();
