const mongoose = require('mongoose');

const groupChatSchema = new mongoose.Schema({
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
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 1000 // Limiting to ~200 words (average 5 chars per word)
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image', 'document', 'emoji'],
    default: 'text'
  },
  // Individual file fields (for single file messages)
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  mimeType: {
    type: String
  },
  // Legacy attachments array (for multiple files, if needed in future)
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat',
    default: null
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  deleted: { 
    type: Boolean, 
    default: false 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  deletedAt: { 
    type: Date 
  },
  editedAt: { 
    type: Date 
  },
  flagged: { 
    type: Boolean, 
    default: false 
  },
  flaggedReason: { 
    type: String 
  },
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  collection: 'groupchats'
});

// Compound indexes for efficient queries
groupChatSchema.index({ courseId: 1, sectionId: 1, timestamp: -1 });
groupChatSchema.index({ senderId: 1, timestamp: -1 });
groupChatSchema.index({ isDeleted: 1, timestamp: -1 });

// Method to check if a user can delete this message
groupChatSchema.methods.canDelete = function(user) {
  if (!user) return false;
  
  // Admin, Dean, and HOD can delete any message
  if (user.roles && (
    user.roles.includes('admin') || 
    user.roles.includes('dean') || 
    user.roles.includes('hod')
  )) {
    return true;
  }
  
  // Users can delete their own messages within 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (this.senderId.toString() === user._id.toString() && this.timestamp > fiveMinutesAgo) {
    return true;
  }
  
  return false;
};

// Method to check if user can see delete button
groupChatSchema.methods.canShowDeleteButton = function(user) {
  if (!user) return false;
  
  // Admin, Dean, and HOD can always see delete button
  if (user.roles && (
    user.roles.includes('admin') || 
    user.roles.includes('dean') || 
    user.roles.includes('hod')
  )) {
    return true;
  }
  
  return false;
};

// Static method for content filtering
groupChatSchema.statics.filterContent = function(message) {
  const vulgarWords = [
    // English vulgar words (expanded)
    'fuck', 'fck', 'fuk', 'f**k', 'shit', 'sht', 'damn', 'dmn', 'bitch', 'btch', 'b*tch',
    'asshole', 'ass', 'bastard', 'crap', 'piss', 'whore', 'slut', 'dick', 'cock', 'penis',
    'pussy', 'vagina', 'sex', 'porn', 'motherfucker', 'mofo', 'nigga', 'nigger', 'faggot',
    'fag', 'retard', 'retarded', 'stupid', 'idiot', 'moron', 'dumb', 'dumbass', 'loser',
    // Hindi vulgar words (expanded)
    'madarchod', 'mc', 'madharchod', 'behenchod', 'bc', 'behen chod', 'bhen chod',
    'chutiya', 'chutia', 'chut', 'lund', 'lauda', 'loda', 'land', 'bhosadi', 'bhosda',
    'randi', 'rande', 'harami', 'haramzada', 'kamina', 'kamine', 'kutte', 'kutta', 'kuta',
    'saala', 'sala', 'saali', 'gandu', 'gaandu', 'gand', 'gaand', 'bakchod', 'bkl',
    'chod', 'chodna', 'goli maar', 'mar ja', 'kutte ki aulad', 'nalayak', 'badtameez',
    // Bengali vulgar words (expanded)
    'chuda', 'choda', 'magir', 'magi', 'bal', 'baal', 'khankir', 'khanki', 'tor ma',
    'kuttar baccha', 'kutti', 'haramjada', 'haramzada', 'shala', 'sala', 'boka', 'pagol',
    'mitchil', 'gadha', 'gadhi', 'ullu', 'bewakoof', 'pagla',
    // Urdu vulgar words
    'harami', 'kutta', 'kameena', 'nalayak', 'badtameez', 'ghatia', 'gandagi',
    // Common variations and spellings
    'fck', 'wtf', 'stfu', 'gtfo', 'sob', 'pos', 'mf', 'mtf', 'kys', 'kill yourself'
  ];

  let filteredMessage = message;
  let flagged = false;
  let flaggedWords = [];

  vulgarWords.forEach(word => {
    // Create regex that matches word boundaries and variations
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(filteredMessage)) {
      flagged = true;
      if (!flaggedWords.includes(word)) {
        flaggedWords.push(word);
      }
      filteredMessage = filteredMessage.replace(regex, '***');
    }
  });

  return {
    original: message,
    filtered: filteredMessage,
    flagged: flagged,
    flaggedWords: flaggedWords
  };
};

// Virtual for display name logic (for backward compatibility)

// Virtual for display name logic (for backward compatibility)
groupChatSchema.virtual('senderName').get(function() {
  if (this.senderId && this.senderId.name) {
    return this.senderId.name;
  }
  return 'Unknown User';
});

// Ensure virtual fields are serialized
groupChatSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('GroupChat', groupChatSchema);