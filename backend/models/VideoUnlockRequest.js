const mongoose = require('mongoose');

const VideoUnlockRequestSchema = new mongoose.Schema({
  // Request details
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
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
  
  // Request information
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  teacherComments: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Approval workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  
  // HOD approval details
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // HOD who reviewed the request
  },
  reviewedAt: {
    type: Date
  },
  hodComments: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Unlock details
  unlockDuration: {
    type: Number, // Duration in hours
    default: 72 // Default 72 hours (3 days)
  },
  unlockedAt: {
    type: Date
  },
  unlockExpiresAt: {
    type: Date
  },
  
  // Request timing
  requestedAt: {
    type: Date,
    default: Date.now
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Auto-expiry for pending requests
  requestExpiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }
  }
}, {
  timestamps: true,
  indexes: [
    { teacher: 1, status: 1 },
    { reviewedBy: 1, status: 1 },
    { student: 1, video: 1 },
    { course: 1, status: 1 },
    { status: 1, requestedAt: -1 },
    { unlockExpiresAt: 1 }, // For cleanup of expired unlocks
    { requestExpiresAt: 1 } // For cleanup of expired requests
  ]
});

// Compound index to prevent duplicate active requests
VideoUnlockRequestSchema.index(
  { student: 1, video: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'approved'] } }
  }
);

// ============ STATIC METHODS ============

// Get pending requests for HOD approval
VideoUnlockRequestSchema.statics.getPendingRequestsForHOD = async function(hodId, filters = {}) {
  const query = {
    status: 'pending',
    requestExpiresAt: { $gt: new Date() },
    ...filters
  };
  
  return await this.find(query)
    .populate('teacher', 'name email teacherId')
    .populate('student', 'name email regNo')
    .populate('video', 'title duration')
    .populate('unit', 'title order')
    .populate('course', 'title courseCode')
    .populate('section', 'name')
    .sort({ priority: -1, requestedAt: 1 }); // Priority first, then FIFO
};

// Get teacher's unlock request history
VideoUnlockRequestSchema.statics.getTeacherRequests = async function(teacherId, filters = {}) {
  const query = { teacher: teacherId, ...filters };
  
  return await this.find(query)
    .populate('student', 'name email regNo')
    .populate('video', 'title duration')
    .populate('unit', 'title order')
    .populate('course', 'title courseCode')
    .populate('reviewedBy', 'name email')
    .sort({ requestedAt: -1 });
};

// Get student's unlock history
VideoUnlockRequestSchema.statics.getStudentUnlocks = async function(studentId, filters = {}) {
  const query = { student: studentId, status: 'approved', ...filters };
  
  return await this.find(query)
    .populate('teacher', 'name email')
    .populate('video', 'title duration')
    .populate('unit', 'title order')
    .populate('course', 'title courseCode')
    .populate('reviewedBy', 'name email')
    .sort({ unlockedAt: -1 });
};

// Check if video is unlocked for student
VideoUnlockRequestSchema.statics.isVideoUnlockedForStudent = async function(studentId, videoId) {
  const now = new Date();
  
  const activeUnlock = await this.findOne({
    student: studentId,
    video: videoId,
    status: 'approved',
    unlockedAt: { $lte: now },
    unlockExpiresAt: { $gt: now }
  });
  
  return !!activeUnlock;
};

// Get active unlocks for a student
VideoUnlockRequestSchema.statics.getActiveUnlocksForStudent = async function(studentId) {
  const now = new Date();
  
  return await this.find({
    student: studentId,
    status: 'approved',
    unlockedAt: { $lte: now },
    unlockExpiresAt: { $gt: now }
  })
  .populate('video', 'title duration')
  .populate('unit', 'title order')
  .populate('course', 'title courseCode')
  .populate('teacher', 'name email')
  .sort({ unlockExpiresAt: 1 }); // Expiring soon first
};

// Approve a request (HOD action)
VideoUnlockRequestSchema.statics.approveRequest = async function(requestId, hodId, hodComments = '', unlockDuration = 72) {
  const now = new Date();
  const unlockExpiresAt = new Date(now.getTime() + unlockDuration * 60 * 60 * 1000);
  
  return await this.findByIdAndUpdate(requestId, {
    status: 'approved',
    reviewedBy: hodId,
    reviewedAt: now,
    hodComments,
    unlockDuration,
    unlockedAt: now,
    unlockExpiresAt
  }, { new: true })
  .populate('teacher', 'name email')
  .populate('student', 'name email regNo')
  .populate('video', 'title')
  .populate('course', 'title courseCode');
};

// Reject a request (HOD action)
VideoUnlockRequestSchema.statics.rejectRequest = async function(requestId, hodId, hodComments = '') {
  return await this.findByIdAndUpdate(requestId, {
    status: 'rejected',
    reviewedBy: hodId,
    reviewedAt: new Date(),
    hodComments
  }, { new: true })
  .populate('teacher', 'name email')
  .populate('student', 'name email regNo')
  .populate('video', 'title')
  .populate('course', 'title courseCode');
};

// Cleanup expired requests and unlocks
VideoUnlockRequestSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  
  // Mark expired pending requests
  const expiredRequests = await this.updateMany(
    {
      status: 'pending',
      requestExpiresAt: { $lt: now }
    },
    {
      status: 'expired'
    }
  );
  
  // Note: Approved requests that are past unlockExpiresAt don't need status change
  // They're just no longer active for access checking
  
  return {
    expiredPendingRequests: expiredRequests.modifiedCount
  };
};

// Get unlock statistics for dashboard
VideoUnlockRequestSchema.statics.getUnlockStats = async function(filters = {}) {
  const stats = await this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    total: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

// ============ INSTANCE METHODS ============

// Check if request can be approved
VideoUnlockRequestSchema.methods.canBeApproved = function() {
  return this.status === 'pending' && this.requestExpiresAt > new Date();
};

// Check if unlock is currently active
VideoUnlockRequestSchema.methods.isUnlockActive = function() {
  if (this.status !== 'approved') return false;
  const now = new Date();
  return this.unlockedAt <= now && this.unlockExpiresAt > now;
};

// Get remaining unlock time in hours
VideoUnlockRequestSchema.methods.getRemainingUnlockHours = function() {
  if (!this.isUnlockActive()) return 0;
  const now = new Date();
  const remainingMs = this.unlockExpiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));
};

// Pre-save middleware to set unlock expiry
VideoUnlockRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'approved' && !this.unlockExpiresAt) {
    const duration = this.unlockDuration || 72; // Default 72 hours
    this.unlockedAt = new Date();
    this.unlockExpiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('VideoUnlockRequest', VideoUnlockRequestSchema);