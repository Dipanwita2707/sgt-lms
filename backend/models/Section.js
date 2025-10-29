const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: false }, // Optional - sections can be school-wide
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // Multiple courses can be assigned to a section
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Legacy single teacher field (backward compatible)
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // New: support multiple teachers per section
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // 70-80 students per section
  capacity: { type: Number, default: 80 }, // Maximum students allowed
  academicYear: { type: String },
  semester: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for better performance
SectionSchema.index({ school: 1 });
SectionSchema.index({ department: 1 });
SectionSchema.index({ teacher: 1 });
SectionSchema.index({ teachers: 1 });
SectionSchema.index({ students: 1 });
SectionSchema.index({ isActive: 1 });

// Virtual for current enrollment count
SectionSchema.virtual('currentEnrollment').get(function() {
  return this.students ? this.students.length : 0;
});

// Virtual for remaining capacity
SectionSchema.virtual('remainingCapacity').get(function() {
  return this.capacity - (this.students ? this.students.length : 0);
});

module.exports = mongoose.model('Section', SectionSchema);
