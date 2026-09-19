const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .populate('leadId')
      .sort({ lastMessageAt: -1 });
    
    // For each conversation, fetch the last message to display in inbox
    const conversationsWithLastMsg = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await Message.findOne({ conversationId: conv._id })
          .sort({ createdAt: -1 });
        
        return {
          ...conv._doc,
          lastMessage: lastMsg ? lastMsg.text : ''
        };
      })
    );

    res.status(200).json({ success: true, data: conversationsWithLastMsg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 });
    
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { text, receiverId } = req.body;
    const conversationId = req.params.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    let messageId = `manual_${Date.now()}`;
    let isWhatsapp = !!conversation.whatsappThreadId;

    if (isWhatsapp) {
      const chatSyncService = require('../services/chatSyncService');
      const response = await chatSyncService.sendTextMessage(receiverId, text);
      // ChatSyncs might return a message ID, we can use it if available
      if (response && response.messageId) {
        messageId = response.messageId;
      }
    } else {
      // Instagram send logic goes here if it exists somewhere else in the codebase
      // Or maybe it's just mock data or another service handles it asynchronously
    }

    // Save to DB
    const message = await Message.create({
      conversationId,
      [isWhatsapp ? 'whatsappMessageId' : 'instagramMessageId']: messageId,
      senderId: 'system',
      receiverId,
      text,
      direction: 'outbound'
    });

    // Update conversation timestamp
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageAt: Date.now()
    });

    // Emit via socket
    const io = req.app.get('io');
    io.emit('newMessage', message);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
