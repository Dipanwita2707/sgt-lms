const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseCode: { type: String, unique: true, index: true },
  title: { type: String, required: true, index: true },
  description: { type: String },
  
  // Hierarchy fields - courses belong to departments under schools
  school: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School',
    required: true,
    index: true
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department',
    required: true,
    index: true
  },
  
  // Teachers are assigned to courses through sections
  // Direct teacher assignment is deprecated in favor of section-based assignment
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  units: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
  hasUnits: { type: Boolean, default: false },
  // Course Coordinator (CC) assigned by HOD - Only ONE CC per course
  coordinators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }], // Keep as array for compatibility but enforce single CC in logic
  // Alternative single CC field (for future migration):
  // coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  
  // Course metadata
  credits: { type: Number, default: 3 },
  semester: { type: String },
  academicYear: { type: String },
  prerequisite: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // Prerequisite courses
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Virtual for calculating total video count including those in units
courseSchema.virtual('totalVideos').get(async function() {
  const directVideoCount = this.videos.length;
  let unitVideoCount = 0;
  
  if (this.hasUnits && this.units && this.units.length > 0) {
    const Unit = mongoose.model('Unit');
    const units = await Unit.find({ _id: { $in: this.units } });
    unitVideoCount = units.reduce((total, unit) => total + (unit.videos ? unit.videos.length : 0), 0);
  }
  
  return directVideoCount + unitVideoCount;
});

// Virtual for getting assigned teachers through sections
courseSchema.virtual('assignedTeachers', {
  ref: 'Section',
  localField: '_id',
  foreignField: 'courses',
  justOne: false
});

// Virtual for getting enrolled students through sections
courseSchema.virtual('enrolledStudents', {
  ref: 'Section',
  localField: '_id', 
  foreignField: 'courses',
  justOne: false
});

// Compound indexes for fast search
courseSchema.index({ department: 1, title: 1 });
courseSchema.index({ school: 1, department: 1 });
courseSchema.index({ courseCode: 1 });

module.exports = mongoose.model('Course', courseSchema);
