const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UnitSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  videos: [{
    type: Schema.Types.ObjectId,
    ref: 'Video'
  }],
  readingMaterials: [{
    type: Schema.Types.ObjectId,
    ref: 'ReadingMaterial'
  }],
  quizzes: [{
    type: Schema.Types.ObjectId,
    ref: 'Quiz'
  }],
  quizPool: {
    type: Schema.Types.ObjectId,
    ref: 'QuizPool'
  },
  // Deadline settings
  hasDeadline: {
    type: Boolean,
    default: false
  },
  deadline: {
    type: Date,
    default: null
  },
  deadlineDescription: {
    type: String,
    trim: true,
    default: ''
  },
  // Settings for deadline enforcement
  strictDeadline: {
    type: Boolean,
    default: true // If true, no marks/watch time counted after deadline
  },
  warningDays: {
    type: Number,
    default: 3 // Days before deadline to show warning
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure unit order is unique within a course
UnitSchema.index({ course: 1, order: 1 }, { unique: true });

// Virtual property to check if deadline is expired
UnitSchema.virtual('isDeadlineExpired').get(function() {
  if (!this.hasDeadline || !this.deadline) {
    return false;
  }
  return new Date() > this.deadline;
});

// Virtual property to get days until deadline
UnitSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.hasDeadline || !this.deadline) {
    return null;
  }
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual property to check if warning should be shown
UnitSchema.virtual('showDeadlineWarning').get(function() {
  if (!this.hasDeadline || !this.deadline) {
    return false;
  }
  const daysLeft = this.daysUntilDeadline;
  return daysLeft <= this.warningDays && daysLeft > 0;
});

// Validation for deadline
UnitSchema.pre('save', function(next) {
  if (this.hasDeadline && !this.deadline) {
    return next(new Error('Deadline date is required when hasDeadline is true'));
  }
  if (this.deadline && this.deadline <= new Date()) {
    return next(new Error('Deadline must be in the future'));
  }
  next();
});

// Ensure unit order is unique within a course
UnitSchema.index({ course: 1, order: 1 }, { unique: true });

// Add a pre-save hook to automatically determine the order if not provided
UnitSchema.pre('save', async function(next) {
  if (this.isNew && this.order === 0) {
    try {
      // Find the highest order for this course
      const Unit = mongoose.model('Unit');
      const highestOrderUnit = await Unit.findOne({ course: this.course })
        .sort('-order')
        .limit(1);
      
      if (highestOrderUnit) {
        this.order = highestOrderUnit.order + 1;
      }
      
      // Update the course to indicate it has units
      const Course = mongoose.model('Course');
      await Course.findByIdAndUpdate(this.course, { hasUnits: true });
    } catch (err) {
      console.error('Error setting unit order:', err);
    }
  }
  
  next();
});

// After saving a unit, update all StudentProgress records to include this unit
UnitSchema.post('save', async function(doc) {
  try {
    if (this.isNew) {
      const StudentProgress = mongoose.model('StudentProgress');
      const User = mongoose.model('User');
      
      // Find all students assigned to this course
      const students = await User.find({
        coursesAssigned: this.course,
        role: 'student'
      }).select('_id');
      
      // Add this unit to each student's progress
      for (const student of students) {
        const progress = await StudentProgress.findOne({
          student: student._id,
          course: this.course
        });
        
        if (progress) {
          // Check if this unit is already in progress
          const unitExists = progress.units.some(
            u => u.unitId && u.unitId.toString() === this._id.toString()
          );
          
          if (!unitExists) {
            // Determine if this is the first unit (order 0)
            const isFirstUnit = this.order === 0;
            
            // Add the unit to progress
            progress.units.push({
              unitId: this._id,
              status: isFirstUnit ? 'in-progress' : 'locked',
              unlocked: isFirstUnit,
              unlockedAt: isFirstUnit ? new Date() : null,
              videosWatched: []
            });
            
            await progress.save();
          }
        }
      }
    }
  } catch (err) {
    console.error('Error updating student progress after unit save:', err);
  }
});

module.exports = mongoose.model('Unit', UnitSchema);
