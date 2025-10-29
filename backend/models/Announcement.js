const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'dean', 'hod', 'teacher'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Hierarchical targeting
  targetAudience: {
    // For admin/superadmin
    allUsers: { type: Boolean, default: false },
    
    // Global announcements (dean to all schools)
    isGlobal: { type: Boolean, default: false },
    
    // Role-based targeting
    targetRoles: [{ type: String, enum: ['admin', 'dean', 'hod', 'teacher', 'student'] }],
    
    // Specific targeting
    targetSchools: [{ type: mongoose.Schema.Types.ObjectId, ref: 'School' }],
    targetDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    targetSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }],
    targetCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    specificUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  
  // Permission and approval
  requiresApproval: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'draft'], 
    default: 'approved' 
  },
  approvalNote: { type: String },
  
  // Cross-school announcement workflow
  targetSchoolDean: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Dean who needs to approve
  crossSchoolRequest: { type: Boolean, default: false }, // Is this a cross-school request
  originalRequestedSchool: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }, // School where announcement should go
  
  // Teacher approval workflow
  submittedForApproval: { type: Boolean, default: false },
  approvalRequestedAt: { type: Date },
  hodReviewRequired: { type: Boolean, default: false },
  
  // Priority and scheduling
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  scheduledFor: { type: Date },
  expiresAt: { type: Date },
  
  // Visibility and status
  isActive: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
  
  // Analytics
  viewCount: { type: Number, default: 0 },
  viewedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  
  // Legacy compatibility
  recipients: [{ type: String, enum: ['teacher', 'student', 'hod', 'dean'] }], // for backward compatibility
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // for backward compatibility
  
  createdAt: { type: Date, default: Date.now },
  isEdited: { type: Boolean, default: false },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date },
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    previousTitle: { type: String },
    previousMessage: { type: String },
    previousTargetAudience: { type: mongoose.Schema.Types.Mixed }
  }],
  
  // Approval history for HOD/Admin tracking
  approvalHistory: [{
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverRole: { type: String },
    action: { type: String, enum: ['approved', 'rejected'] },
    actionDate: { type: Date, default: Date.now },
    note: { type: String },
    previousStatus: { type: String }
  }]
});

// Indexes for better performance
AnnouncementSchema.index({ sender: 1 });
AnnouncementSchema.index({ role: 1 });
AnnouncementSchema.index({ 'targetAudience.targetSchools': 1 });
AnnouncementSchema.index({ 'targetAudience.targetDepartments': 1 });
AnnouncementSchema.index({ 'targetAudience.targetSections': 1 });
AnnouncementSchema.index({ approvalStatus: 1 });
AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ isActive: 1 });
AnnouncementSchema.index({ scheduledFor: 1 });
AnnouncementSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
