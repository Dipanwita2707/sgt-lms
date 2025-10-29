const mongoose = require('mongoose');

const contentBlockSchema = new mongoose.Schema({
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  sequence: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  videos: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Video' 
  }],
  quiz: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Quiz' 
  },
  unlockRequirement: {
    type: String,
    enum: ['none', 'previous-block', 'previous-quiz'],
    default: 'none'
  },
  minScoreToUnlock: {
    type: Number,
    min: 0,
    max: 100,
    default: 70 // Default passing score of 70%
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for finding blocks by course and sequence
contentBlockSchema.index({ course: 1, sequence: 1 }, { unique: true });

module.exports = mongoose.model('ContentBlock', contentBlockSchema);
