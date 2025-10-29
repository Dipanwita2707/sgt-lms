const mongoose = require('mongoose');

/**
 * Chat Read Receipt Model
 * Tracks the last message each user has read in each course-section chat
 */
const chatReadReceiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true,
    index: true
  },
  lastReadMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat',
    default: null
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'chatreadreceipts'
});

// Compound index for efficient queries
chatReadReceiptSchema.index({ userId: 1, courseId: 1, sectionId: 1 }, { unique: true });
chatReadReceiptSchema.index({ userId: 1, lastReadAt: -1 });

// Static method to update or create read receipt
chatReadReceiptSchema.statics.updateReadReceipt = async function(userId, courseId, sectionId, lastReadMessageId) {
  try {
    const receipt = await this.findOneAndUpdate(
      { userId, courseId, sectionId },
      { 
        lastReadMessageId, 
        lastReadAt: new Date() 
      },
      { 
        upsert: true, 
        new: true, 
        setDefaultsOnInsert: true 
      }
    );
    return receipt;
  } catch (error) {
    console.error('Error updating read receipt:', error);
    throw error;
  }
};

// Static method to get unread count for a specific chat
chatReadReceiptSchema.statics.getUnreadCount = async function(userId, courseId, sectionId) {
  try {
    const GroupChat = mongoose.model('GroupChat');
    
    // Get the read receipt
    const receipt = await this.findOne({ userId, courseId, sectionId });
    
    // Build query for unread messages
    const query = {
      courseId,
      sectionId,
      isDeleted: false,
      senderId: { $ne: userId } // Don't count own messages
    };
    
    // If user has read some messages, only count newer ones
    if (receipt && receipt.lastReadMessageId) {
      query._id = { $gt: receipt.lastReadMessageId };
    }
    
    const unreadCount = await GroupChat.countDocuments(query);
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Static method to get all unread counts for a user
chatReadReceiptSchema.statics.getAllUnreadCounts = async function(userId, chatRooms) {
  try {
    const GroupChat = mongoose.model('GroupChat');
    const unreadCounts = {};
    
    // Get all read receipts for this user
    const receipts = await this.find({ userId });
    const receiptMap = {};
    
    receipts.forEach(r => {
      const key = `${r.courseId}_${r.sectionId}`;
      receiptMap[key] = r.lastReadMessageId;
    });
    
    // Calculate unread for each chat room
    for (const room of chatRooms) {
      const key = `${room.courseId}_${room.sectionId}`;
      const lastReadMessageId = receiptMap[key];
      
      const query = {
        courseId: room.courseId,
        sectionId: room.sectionId,
        isDeleted: false,
        senderId: { $ne: userId }
      };
      
      if (lastReadMessageId) {
        query._id = { $gt: lastReadMessageId };
      }
      
      const count = await GroupChat.countDocuments(query);
      unreadCounts[key] = count;
    }
    
    return unreadCounts;
  } catch (error) {
    console.error('Error getting all unread counts:', error);
    return {};
  }
};

module.exports = mongoose.model('ChatReadReceipt', chatReadReceiptSchema);
