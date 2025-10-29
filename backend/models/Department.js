const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // HOD assignment is optional
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  established: {
    type: Date
  },
  budget: {
    type: Number,
    default: 0
  },
  contact: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    office: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
departmentSchema.index({ code: 1 });
departmentSchema.index({ school: 1 });
departmentSchema.index({ hod: 1 });
departmentSchema.index({ isActive: 1 });

// Virtual for course count
departmentSchema.virtual('courseCount', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'department',
  count: true
});

// Virtual for teacher count
departmentSchema.virtual('teacherCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'department',
  count: true
});

// Virtual for student count across all courses
departmentSchema.virtual('studentCount', {
  ref: 'User',
  localField: 'courses',
  foreignField: 'coursesAssigned',
  count: true
});

module.exports = mongoose.model('Department', departmentSchema);
