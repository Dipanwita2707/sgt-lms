const mongoose = require('mongoose');

const quizConfigurationSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  timeLimit: {
    type: Number, // in minutes
    default: 30,
    required: true,
    min: 5,
    max: 180
  },
  numberOfQuestions: {
    type: Number,
    default: 10,
    required: true,
    min: 1,
    max: 50
  },
  passingPercentage: {
    type: Number,
    default: 40,
    min: 0,
    max: 100
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  shuffleQuestions: {
    type: Boolean,
    default: true
  },
  showResultsImmediately: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for faster queries
quizConfigurationSchema.index({ course: 1, section: 1, unit: 1 });

module.exports = mongoose.model('QuizConfiguration', quizConfigurationSchema);
