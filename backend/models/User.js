const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // New unified UID system - PURELY NUMERIC
  uid: { 
    type: String, 
    unique: true, 
    sparse: true, 
    index: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null for legacy users
        // Staff (teacher, hod, dean, admin): 5 digits (00001-99999)
        // Students: 8+ digits (00000001-99999999...)
        return /^\d{5}$/.test(v) || /^\d{8,}$/.test(v);
      },
      message: props => `${props.value} is not a valid UID! Staff should be ##### (5 digits), Students should be ######## (8+ digits)`
    }
  },
  
  // Legacy fields - kept for backward compatibility, will be migrated to uid
  regNo: { type: String, unique: true, sparse: true, index: true }, // Only for students - DEPRECATED
  teacherId: { type: String, unique: true, sparse: true, index: true }, // Only for teachers - DEPRECATED
  
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    set: v => v.toLowerCase() // Convert email to lowercase before saving
  },
  password: { type: String, required: true },
  // Multi-role system - each user can have multiple roles
  roles: [{ 
    type: String, 
    enum: ['admin', 'teacher', 'student', 'dean', 'hod']
  }],
  primaryRole: { 
    type: String, 
    enum: ['admin', 'teacher', 'student', 'dean', 'hod']
  },
  
  // Role-specific assignments - each role can have different school/department contexts
  roleAssignments: [{
    role: { 
      type: String, 
      enum: ['admin', 'teacher', 'student', 'dean', 'hod'],
      required: true
    },
    school: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'School'
    },
    departments: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Department'
    }],
    // For dean role: multiple schools they oversee
    schools: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'School'
    }],
    isActive: { type: Boolean, default: true },
    assignedAt: { type: Date, default: Date.now }
  }],
  
  // Legacy field for backward compatibility (will be removed after migration)
  role: { type: String, enum: ['admin', 'teacher', 'student', 'dean', 'hod'] },
  permissions: [{ type: String }], // e.g., ['manage_teachers', 'manage_students']
  
  // Hierarchy fields
  school: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School',
    required: function() {
      // School is required for all roles except admin and superadmin
      return this.role !== 'admin' && this.role !== 'superadmin' && 
             (!this.roles || (!this.roles.includes('admin') && !this.roles.includes('superadmin')));
    },
    index: true
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department',
    index: true
  },
  departments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department',
    index: true
  }],
  
  // REMOVED: coursesAssigned - teachers are only connected to courses through sections
  
  // Section assignments (students and teachers get courses through sections)
  assignedSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section', index: true }],
  
  watchHistory: [{
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    timeSpent: { type: Number, default: 0 }, // in seconds
    lastWatched: { type: Date },
    currentPosition: { type: Number, default: 0 }, // Current playback position in seconds
    playbackRate: { type: Number, default: 1 } // Playback speed (1x, 1.5x, 2x, etc.)
  }],
  isActive: { type: Boolean, default: true },
  canAnnounce: { type: Boolean, default: false }, // Allow teacher to post announcements
  emailVerified: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  
  // Digital Signature for certificates (HOD, Dean, AAST Registrar)
  signatureUrl: { type: String }, // Path or URL to signature image (HOD/Dean signature)
  registrarSignatureUrl: { type: String } // HOD uploads registrar/exam signature for their department
}, {
  timestamps: true
});

// Compound index for fast search by regNo and email
userSchema.index({ regNo: 1, email: 1 });
userSchema.index({ role: 1, school: 1 });
userSchema.index({ role: 1, department: 1 });
// REMOVED: coursesAssigned index - no longer supporting direct course assignments

// Virtual to get courses through sections
userSchema.virtual('coursesFromSections', {
  ref: 'Section',
  localField: 'assignedSections',
  foreignField: '_id',
  justOne: false
});

// Ensure email is always lowercase before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  // Set default values for multi-role system (backward compatibility)
  if (this.isNew) {
    // If roles array is empty but role field exists, populate roles from role
    if ((!this.roles || this.roles.length === 0) && this.role) {
      this.roles = [this.role];
    }
    
    // If primaryRole is not set but role field exists, set it
    if (!this.primaryRole && this.role) {
      this.primaryRole = this.role;
    }
    
    // If role field is not set but roles array exists, set role from primary
    if (!this.role && this.roles && this.roles.length > 0) {
      this.role = this.primaryRole || this.roles[0];
    }
  }
  
  // Generate teacherId for new staff accounts: teacher, HOD, dean (5-digit numeric format)
  const staffRoles = ['teacher', 'hod', 'dean'];
  const hasStaffRole = this.role && staffRoles.includes(this.role) || 
                       (this.roles && this.roles.some(r => staffRoles.includes(r)));
  
  if (this.isNew && hasStaffRole && !this.teacherId) {
    try {
      // Find the highest existing teacherId (numeric format: 5 digits)
      const highestStaff = await this.constructor.findOne(
        { teacherId: { $regex: /^\d{5}$/ } },
        { teacherId: 1 },
        { sort: { teacherId: -1 } }
      );

      let nextNumber = 1;
      if (highestStaff && highestStaff.teacherId) {
        // Parse the numeric ID and increment
        const currentNumber = parseInt(highestStaff.teacherId, 10);
        nextNumber = currentNumber + 1;
      }

      // Format with leading zeros to ensure 5 digits
      this.teacherId = nextNumber.toString().padStart(5, '0');
    } catch (err) {
      return next(err);
    }
  }
  
  next();
});

module.exports = mongoose.model('User', userSchema);
