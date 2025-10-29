const { hasRole } = require('./roleUtils');

/**
 * Check if a user has access to a specific course
 * Teachers: Through SectionCourseTeacher assignments
 * Students: Through section enrollment  
 */
async function hasAccessToCourse(user, courseId) {
  if (!user || !courseId) return false;
  
  // Admin has access to all courses
  if (hasRole(user, 'admin')) {
    return true;
  }
  
  // Teacher access through SectionCourseTeacher assignments
  if (hasRole(user, 'teacher')) {
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const assignment = await SectionCourseTeacher.findOne({
      teacher: user._id,
      course: courseId,
      isActive: true
    });
    return !!assignment;
  }
  
  // Student access through section enrollment
  if (hasRole(user, 'student')) {
    const Section = require('../models/Section');
    const userSection = await Section.findOne({
      students: user._id,
      courses: courseId
    });
    return !!userSection;
  }
  
  return false;
}

/**
 * Get all course IDs that a user has access to
 */
async function getUserAccessibleCourses(user) {
  if (!user) return [];
  
  // Admin has access to all courses
  if (hasRole(user, 'admin')) {
    const Course = require('../models/Course');
    const courses = await Course.find({}, '_id');
    return courses.map(c => c._id);
  }
  
  // Teacher courses through SectionCourseTeacher assignments
  if (hasRole(user, 'teacher')) {
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const assignments = await SectionCourseTeacher.find({
      teacher: user._id,
      isActive: true
    }, 'course');
    return assignments.map(a => a.course);
  }
  
  // Student courses through section enrollment
  if (hasRole(user, 'student')) {
    const Section = require('../models/Section');
    const sections = await Section.find({
      students: user._id
    }).populate('courses', '_id');
    
    const courseIds = [];
    sections.forEach(section => {
      section.courses.forEach(course => {
        courseIds.push(course._id);
      });
    });
    return courseIds;
  }
  
  return [];
}

module.exports = {
  hasAccessToCourse,
  getUserAccessibleCourses
};