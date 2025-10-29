const mongoose = require('mongoose');

const studentProgressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  unlockedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  completedReadingMaterials: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReadingMaterial'
  }],
  units: [{
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit'
    },
    status: {
      type: String,
      enum: ['locked', 'in-progress', 'completed'],
      default: 'in-progress'
    },
    unlocked: {
      type: Boolean,
      default: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    videosWatched: [{
      videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
      },
      completed: {
        type: Boolean,
        default: false
      },
      timeSpent: {
        type: Number,
        default: 0
      },
      lastWatched: {
        type: Date
      },
      // Track if this was watched after unit deadline
      watchedAfterDeadline: {
        type: Boolean,
        default: false
      }
    }],
    readingMaterialsCompleted: [{
      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReadingMaterial'
      },
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date
      }
    }],
    quizAttempts: [{
      quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
      },
      quizPoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizPool'
      },
      attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizAttempt'
      },
      score: {
        type: Number,
        default: 0
      },
      maxScore: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0
      },
      passed: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date
      },
      // Track if this was completed after unit deadline
      completedAfterDeadline: {
        type: Boolean,
        default: false
      }
    }],
    unitQuizCompleted: {
      type: Boolean,
      default: false
    },
    unitQuizPassed: {
      type: Boolean,
      default: false
    },
    // Additional attempts allowance granted by admin
    extraAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    securityLock: {
      locked: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      lockedAt: { type: Date },
      violationCount: { type: Number, default: 0 },
      autoSubmittedAttempt: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizAttempt' },
      unlockHistory: [{
        unlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        unlockedAt: { type: Date },
        note: { type: String, default: '' }
      }]
    },
    allVideosWatched: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    // Deadline enforcement tracking
    completedAfterDeadline: {
      type: Boolean,
      default: false
    },
    deadlineWarningShown: {
      type: Boolean,
      default: false
    }
  }],
  contentBlocks: [{
    blockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContentBlock'
    },
    status: {
      type: String,
      enum: ['locked', 'in-progress', 'completed'],
      default: 'locked'
    },
    videosWatched: [{
      videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
      },
      completed: {
        type: Boolean,
        default: false
      },
      timeSpent: {
        type: Number,
        default: 0
      },
      lastWatched: {
        type: Date
      }
    }],
    quizAttempts: [{
      attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizAttempt'
      },
      score: {
        type: Number,
        default: 0
      },
      passed: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date
      }
    }],
    unlocked: {
      type: Boolean,
      default: false
    },
    unlockedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  }],
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index for fast lookup by student and course
studentProgressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('StudentProgress', studentProgressSchema);
