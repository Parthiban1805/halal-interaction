const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Lead = require('../models/Lead');
const Comment = require('../models/Comment');

// You can provide your Page ID as an environment variable or hardcode it here
// e.g. set it in .env as META_PAGE_ID=17841476551518298
const PAGE_ID = process.env.META_PAGE_ID || '17841476551518298'; 

const JSON_FILE_PATH = path.join(__dirname, '../../extracted_comments1 (1).json');

async function migrateComments() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect('mongodb+srv://vkaswinkanan:6kZ5pZkxkjCYEtOH@cluster0.7ejtsim.mongodb.net/prod?appName=Cluster1');
    console.log('Connected successfully.\n');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }

  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`Could not find JSON file at ${JSON_FILE_PATH}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
  console.log(`Found ${data.length} comments to migrate.\n`);

  let newLeadsCreated = 0;
  let commentsUpserted = 0;
  let skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    try {
      const isSelf = c.senderId === PAGE_ID;
      let lead = null;

      // 1. Ensure Lead Exists
      if (!isSelf) {
        // Look up by senderId (platformUserId)
        lead = await Lead.findOne({ platformUserId: c.senderId });
        
        if (!lead) {
          // Create new Lead if it doesn't exist
          lead = await Lead.create({
            platformUserId: c.senderId,
            username: c.username || `IG_User_${c.senderId}`,
            source: 'comment',
            status: 'new',
            priority: 'normal'
          });
          newLeadsCreated++;
        }
      } else if (c.parentCommentId) {
        // If it's your own reply, try to attach it to the parent comment's lead
        const parentComment = await Comment.findOne({ instagramCommentId: c.parentCommentId });
        if (parentComment) {
          lead = await Lead.findById(parentComment.leadId);
        }
      }

      // 2. Prepare Comment Data
      const commentData = {
        senderId: c.senderId,
        text: c.text,
        mediaId: c.mediaId,
        postThumbnail: c.postThumbnail,
        postCaption: c.postCaption,
        parentCommentId: c.parentCommentId || null,
        direction: isSelf ? 'outbound' : 'inbound',
        isAutomated: false,
        isReplied: false, // Explicitly set to false as requested
        createdAt: c.timestamp ? new Date(c.timestamp) : new Date()
      };

      if (lead) {
        commentData.leadId = lead._id;
      }

      // 3. Upsert Comment
      // This prevents duplicates if you run the script multiple times
      await Comment.updateOne(
        { instagramCommentId: c.instagramCommentId },
        { $setOnInsert: commentData }, // Only set these fields if inserting for the first time
        { upsert: true }
      );
      
      commentsUpserted++;

      if ((i + 1) % 500 === 0) {
        console.log(`Processed ${i + 1}/${data.length} comments...`);
      }
    } catch (err) {
      console.error(`Error processing comment ID ${c.instagramCommentId}:`, err.message);
      skipped++;
    }
  }

  console.log('\n--- Migration Complete ---');
  console.log(`Total Comments Processed: ${data.length}`);
  console.log(`New Leads Created: ${newLeadsCreated}`);
  console.log(`Comments Upserted (Inserted or Skipped if existing): ${commentsUpserted}`);
  console.log(`Errors/Skipped: ${skipped}`);
  
  mongoose.disconnect();
  process.exit(0);
}

migrateComments();
