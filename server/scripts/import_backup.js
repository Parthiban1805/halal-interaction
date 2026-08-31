const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Lead = require('../models/Lead');
const Comment = require('../models/Comment');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const BACKUP_DIR = path.join(__dirname, '../../crm_backup_files');

async function importBackup() {
  console.log('Connecting to MongoDB...');
  try {
    // using the hardcoded URI as per previous steps, or process.env
    await mongoose.connect('mongodb+srv://vkaswinkanan:6kZ5pZkxkjCYEtOH@cluster0.7ejtsim.mongodb.net/prod?appName=Cluster1');
    console.log('Connected successfully.\n');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }

  // Load JSON data
  const leadsData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'leads.json'), 'utf-8'));
  const commentsData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'comments.json'), 'utf-8'));
  const convosData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'conversations.json'), 'utf-8'));
  const messagesData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'messages.json'), 'utf-8'));

  // Maps to store old _id -> new _id
  const leadIdMap = {};
  const convoIdMap = {};

  let leadsInserted = 0, leadsSkipped = 0;
  let convosInserted = 0, convosSkipped = 0;
  let commentsInserted = 0, commentsSkipped = 0;
  let messagesInserted = 0, messagesSkipped = 0;

  console.log(`Processing ${leadsData.length} Leads...`);
  for (const oldLead of leadsData) {
    try {
      let lead = await Lead.findOne({ platformUserId: oldLead.platformUserId });
      if (!lead) {
        // Create new lead from backup, omitting the old _id and __v
        const { _id, __v, ...leadData } = oldLead;
        lead = await Lead.create(leadData);
        leadsInserted++;
      } else {
        leadsSkipped++;
      }
      leadIdMap[oldLead._id] = lead._id.toString();
    } catch (err) {
      console.error(`Error processing lead ${oldLead.platformUserId}:`, err.message);
    }
  }

  console.log(`Processing ${convosData.length} Conversations...`);
  for (const oldConvo of convosData) {
    try {
      const newLeadId = leadIdMap[oldConvo.leadId];
      if (!newLeadId) {
        console.warn(`Skipping conversation ${oldConvo._id} - matching Lead not found.`);
        continue;
      }

      let convo = await Conversation.findOne({ instagramThreadId: oldConvo.instagramThreadId });
      if (!convo) {
        const { _id, __v, leadId, ...convoData } = oldConvo;
        convoData.leadId = newLeadId;
        convo = await Conversation.create(convoData);
        convosInserted++;
      } else {
        convosSkipped++;
      }
      convoIdMap[oldConvo._id] = convo._id.toString();
    } catch (err) {
      console.error(`Error processing conversation ${oldConvo.instagramThreadId}:`, err.message);
    }
  }

  console.log(`Processing ${commentsData.length} Comments...`);
  for (const oldComment of commentsData) {
    try {
      const newLeadId = leadIdMap[oldComment.leadId];
      if (!newLeadId) {
        console.warn(`Skipping comment ${oldComment.instagramCommentId} - matching Lead not found.`);
        continue;
      }

      const { _id, __v, leadId, ...commentData } = oldComment;
      commentData.leadId = newLeadId;

      const result = await Comment.updateOne(
        { instagramCommentId: commentData.instagramCommentId },
        { $setOnInsert: commentData },
        { upsert: true }
      );
      if (result.upsertedCount > 0) commentsInserted++;
      else commentsSkipped++;

    } catch (err) {
      console.error(`Error processing comment ${oldComment.instagramCommentId}:`, err.message);
    }
  }

  console.log(`Processing ${messagesData.length} Messages...`);
  for (const oldMsg of messagesData) {
    try {
      const newConvoId = convoIdMap[oldMsg.conversationId];
      if (!newConvoId) {
        console.warn(`Skipping message ${oldMsg.instagramMessageId} - matching Conversation not found.`);
        continue;
      }

      const { _id, __v, conversationId, ...msgData } = oldMsg;
      msgData.conversationId = newConvoId;

      const result = await Message.updateOne(
        { instagramMessageId: msgData.instagramMessageId },
        { $setOnInsert: msgData },
        { upsert: true }
      );
      if (result.upsertedCount > 0) messagesInserted++;
      else messagesSkipped++;

    } catch (err) {
      console.error(`Error processing message ${oldMsg.instagramMessageId}:`, err.message);
    }
  }

  console.log('\n--- Import Complete ---');
  console.log(`Leads: ${leadsInserted} inserted, ${leadsSkipped} skipped (already existed)`);
  console.log(`Conversations: ${convosInserted} inserted, ${convosSkipped} skipped`);
  console.log(`Comments: ${commentsInserted} inserted, ${commentsSkipped} skipped (already existed)`);
  console.log(`Messages: ${messagesInserted} inserted, ${messagesSkipped} skipped`);
  
  mongoose.disconnect();
  process.exit(0);
}

importBackup();
