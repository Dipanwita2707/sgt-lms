const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // Basic Info
  action: { type: String, required: true, index: true },
  description: { type: String }, // Human-readable description of the action
  actionType: { 
    type: String, 
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'access', 'export', 'import', 'other'],
    default: 'other',
    index: true
  },
  
  // User Information
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  performedByRole: { type: String, index: true }, // Cache role for faster queries
  performedByName: { type: String }, // Cache name for faster display
  performedByEmail: { type: String }, // Cache email for faster display
  
  // Target Information
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  targetUserRole: { type: String },
  targetUserName: { type: String },
  targetResource: { type: String, index: true }, // e.g., 'course', 'student', 'teacher', 'quiz', 'announcement'
  targetResourceId: { type: mongoose.Schema.Types.ObjectId },
  
  // Request Details
  ipAddress: { type: String, index: true },
  userAgent: { type: String },
  requestMethod: { type: String }, // GET, POST, PUT, DELETE
  requestUrl: { type: String },
  requestBody: { type: Object }, // Sanitized request body (excluding passwords)
  
  // Response Details
  status: { 
    type: String, 
    enum: ['success', 'failure', 'error', 'warning'],
    default: 'success',
    index: true
  },
  statusCode: { type: Number },
  errorMessage: { type: String },
  
  // Additional Context
  severity: { 
    type: String, 
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    default: 'info',
    index: true
  },
  category: { 
    type: String, 
    enum: [
      'authentication', 'authorization', 'user_management', 'course_management',
      'student_management', 'teacher_management', 'content_management', 
      'analytics', 'settings', 'security', 'bulk_operations', 'data_export',
      'data_import', 'system', 'other'
    ],
    default: 'other',
    index: true
  },
  
  // Detailed Information
  details: { type: Object },
  changes: { // Track what was changed
    before: { type: Object },
    after: { type: Object }
  },
  
  // Metadata
  sessionId: { type: String },
  deviceInfo: {
    browser: { type: String },
    os: { type: String },
    device: { type: String }
  },
  location: {
    country: { type: String },
    city: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  
  // Timing
  duration: { type: Number }, // Request duration in ms
  timestamp: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  
  // Flags
  isSystemGenerated: { type: Boolean, default: false },
  isSuspicious: { type: Boolean, default: false, index: true },
  requiresReview: { type: Boolean, default: false },
  reviewed: { type: Boolean, default: false },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  
  // Tags for custom categorization
  tags: [{ type: String }]
}, {
  timestamps: true,
  collection: 'auditlogs'
});

// Indexes for faster queries
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });
AuditLogSchema.index({ status: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
AuditLogSchema.index({ isSuspicious: 1, createdAt: -1 });
AuditLogSchema.index({ targetResource: 1, targetResourceId: 1 });

// Virtual for formatted timestamp
AuditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.createdAt.toLocaleString();
});

// Method to mark as reviewed
AuditLogSchema.methods.markAsReviewed = function(reviewerId) {
  this.reviewed = true;
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  return this.save();
};

// Static method for bulk logging
AuditLogSchema.statics.logActivity = async function(activityData) {
  try {
    return await this.create(activityData);
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to prevent breaking main application flow
    return null;
  }
};

// Static method for advanced search
AuditLogSchema.statics.advancedSearch = async function(filters = {}) {
  const query = {};
  
  if (filters.action) query.action = { $regex: filters.action, $options: 'i' };
  if (filters.performedBy) query.performedBy = filters.performedBy;
  if (filters.targetUser) query.targetUser = filters.targetUser;
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (filters.severity) query.severity = filters.severity;
  if (filters.isSuspicious !== undefined) query.isSuspicious = filters.isSuspicious;
  if (filters.targetResource) query.targetResource = filters.targetResource;
  
  // Date range
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }
  
  // IP Address
  if (filters.ipAddress) query.ipAddress = filters.ipAddress;
  
  const limit = filters.limit || 100;
  const skip = filters.skip || 0;
  
  return this.find(query)
    .populate('performedBy', 'name email role')
    .populate('targetUser', 'name email role')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
