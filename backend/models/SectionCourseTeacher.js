const mongoose = require('mongoose');

const SectionCourseTeacherSchema = new mongoose.Schema({
  section: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Section', 
    required: true 
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  assignedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  assignedAt: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  academicYear: { type: String },
  semester: { type: String }
}, {
  timestamps: true
});

// Compound indexes to ensure uniqueness and performance
SectionCourseTeacherSchema.index({ section: 1, course: 1 }, { unique: true }); // One teacher per course per section
SectionCourseTeacherSchema.index({ section: 1 });
SectionCourseTeacherSchema.index({ course: 1 });
SectionCourseTeacherSchema.index({ teacher: 1 });
SectionCourseTeacherSchema.index({ isActive: 1 });

// Static method to get teacher for a specific course in a section
SectionCourseTeacherSchema.statics.getTeacherForCourse = async function(sectionId, courseId) {
  const assignment = await this.findOne({
    section: sectionId,
    course: courseId,
    isActive: true
  }).populate('teacher', 'name email teacherId');
  
  return assignment ? assignment.teacher : null;
};

// Static method to get all course-teacher assignments for a section
SectionCourseTeacherSchema.statics.getSectionCourseTeachers = async function(sectionId) {
  return await this.find({
    section: sectionId,
    isActive: true
  }).populate('course', 'title courseCode')
    .populate('teacher', 'name email teacherId')
    .populate('assignedBy', 'name email')
    .populate({
      path: 'section',
      select: 'name',
      populate: {
        path: 'school',
        select: 'name'
      }
    })
    .sort({ assignedAt: -1 });
};

// Static method to get all sections and courses for a teacher
SectionCourseTeacherSchema.statics.getTeacherAssignments = async function(teacherId) {
  return await this.find({
    teacher: teacherId,
    isActive: true
  }).populate({
      path: 'section',
      select: 'name',
      populate: {
        path: 'school',
        select: 'name'
      }
    })
    .populate('course', 'title courseCode')
    .populate('assignedBy', 'name email')
    .sort({ assignedAt: -1 });
};

// Static method to check if a course in a section already has a teacher
SectionCourseTeacherSchema.statics.isCourseAssigned = async function(sectionId, courseId) {
  const assignment = await this.findOne({
    section: sectionId,
    course: courseId,
    isActive: true
  });
  return !!assignment;
};

// Static method to get unassigned courses in a section
SectionCourseTeacherSchema.statics.getUnassignedCourses = async function(sectionId) {
  const Section = mongoose.model('Section');
  const section = await Section.findById(sectionId).populate({
    path: 'courses',
    select: 'title courseCode department',
    populate: {
      path: 'department',
      select: 'name code'
    }
  });
  
  if (!section) {
    throw new Error('Section not found');
  }

  const assignedCourses = await this.find({
    section: sectionId,
    isActive: true
  }).select('course');

  const assignedCourseIds = assignedCourses.map(a => a.course.toString());
  
  const unassignedCourses = section.courses.filter(course => 
    !assignedCourseIds.includes(course._id.toString())
  );

  return unassignedCourses;
};

module.exports = mongoose.model('SectionCourseTeacher', SectionCourseTeacherSchema);