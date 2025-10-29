const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
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
  dean: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Dean assignment is optional
  },
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  established: {
    type: Date
  },
  location: {
    type: String,
    trim: true
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
    address: {
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
schoolSchema.index({ code: 1 });
schoolSchema.index({ dean: 1 });
schoolSchema.index({ isActive: 1 });

// Virtual for department count
schoolSchema.virtual('departmentCount', {
  ref: 'Department',
  localField: '_id',
  foreignField: 'school',
  count: true
});

// Virtual for total courses count across all departments
schoolSchema.virtual('totalCourses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'school',
  count: true
});

module.exports = mongoose.model('School', schoolSchema);
