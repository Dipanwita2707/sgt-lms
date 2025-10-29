const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isAnswer: {
    type: Boolean,
    default: false
  }
});

const DiscussionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  replies: [ReplySchema],
  isResolved: {
    type: Boolean,
    default: false
  },
  isAnnouncement: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add updatedAt middleware
DiscussionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for better query performance
DiscussionSchema.index({ course: 1 });
DiscussionSchema.index({ user: 1 });
DiscussionSchema.index({ isResolved: 1 });
DiscussionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Discussion', DiscussionSchema);
