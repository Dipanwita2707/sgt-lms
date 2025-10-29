const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');
const { auth, authorizeRoles } = require('../middleware/auth');

// NOTICE: Teacher assignment functionality has been moved to /api/teacher-assignments
// Use the enhanced teacher assignment system for better role validation and department matching

// Debug route to check section count (remove in production) - unprotected for testing
router.get('/debug/count', async (req, res) => {
  try {
    const Section = require('../models/Section');
    const count = await Section.countDocuments();
    const sections = await Section.find().select('name school department').populate('school', 'name').populate('department', 'name');
    res.json({ 
      message: `Found ${count} sections in database`,
      count,
      sections: sections.map(s => ({
        name: s.name,
        school: s.school?.name || 'No school',
        department: s.department?.name || 'No department'
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug route to test teacher sections (remove in production)
router.get('/debug/teacher/:teacherId', async (req, res) => {
  try {
    const Section = require('../models/Section');
    const { teacherId } = req.params;
    const sections = await Section.find({ teacher: teacherId })
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('courses', 'title courseCode')
      .populate('teacher', 'name email teacherId')
      .populate('students', 'name email regNo');
    res.json({ 
      teacherId,
      sectionsCount: sections.length,
      sections 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protect all section routes - require authentication and admin role for management operations
router.use(auth);

// Enhanced: Get available sections for live class scheduling
router.get('/available', 
  authorizeRoles('teacher', 'admin', 'hod', 'dean'),
  sectionController.getAvailableSections
);

// Create a section (admin only)
router.post('/create', authorizeRoles('admin'), sectionController.createSection);
// Get all sections (admin, teacher can view their sections)
router.get('/', authorizeRoles('admin', 'teacher', 'student'), sectionController.getAllSections);
// Update a section (admin only)
router.put('/:id', authorizeRoles('admin'), sectionController.updateSection);
// DEPRECATED: Use enhanced teacher assignment system at /api/teacher-assignments
router.post('/assign-teacher', authorizeRoles('admin'), sectionController.assignTeacher);
// Assign students (admin only)
router.post('/assign-students', authorizeRoles('admin'), sectionController.assignStudents);
// Get sections by course (authenticated users)
router.get('/course/:courseId', authorizeRoles('admin', 'teacher', 'student'), sectionController.getSectionsByCourse);
// Get teacher-student connections via section (teacher, admin)
router.get('/teacher/:teacherId/connections', authorizeRoles('admin', 'teacher'), sectionController.getTeacherStudentConnections);
// Get sections by teacher ID (teacher, admin)
router.get('/teacher/:teacherId', authorizeRoles('admin', 'teacher'), sectionController.getTeacherStudentConnections);
// Get student's section (student, admin, teacher)
router.get('/student/:studentId', auth, authorizeRoles('admin', 'teacher', 'student'), sectionController.getStudentSection);

// Get section details with course assignments
router.get('/:sectionId/details', authorizeRoles('admin', 'hod', 'teacher'), sectionController.getSectionDetails);

// Analytics routes (admin, teacher)
router.get('/analytics/teacher/:teacherId/overview', authorizeRoles('admin', 'teacher'), sectionController.getTeacherAnalyticsOverview);

// ============ DEPRECATED COURSE-TEACHER ASSIGNMENT ROUTES ============
// Use enhanced teacher assignment system at /api/teacher-assignments instead

// DEPRECATED: Use /api/teacher-assignments/teachers endpoint
router.get('/:sectionId/unassigned-courses', authorizeRoles('admin'), sectionController.getUnassignedCourses);

// DEPRECATED: Use /api/teacher-assignments/assign endpoint  
router.post('/:sectionId/assign-course-teacher', authorizeRoles('admin'), sectionController.assignCourseTeacher);

// DEPRECATED: Use /api/teacher-assignments/section/:sectionId endpoint
router.get('/:sectionId/course-teachers', authorizeRoles('admin', 'teacher'), sectionController.getSectionCourseTeachers);

// DEPRECATED: Use /api/teacher-assignments/remove endpoint
router.delete('/:sectionId/course/:courseId/teacher', authorizeRoles('admin'), sectionController.removeCourseTeacher);

// DEPRECATED: Use /api/teacher-assignments/teacher/:teacherId endpoint
router.get('/teacher/:teacherId/course-assignments', authorizeRoles('admin', 'teacher'), sectionController.getTeacherCourseAssignments);

router.get('/analytics/:sectionId', authorizeRoles('admin', 'teacher'), sectionController.getSectionAnalytics);

// Student assignment routes (admin only)
router.post('/assign-student', authorizeRoles('admin'), sectionController.assignStudentToSection);
router.post('/remove-student', authorizeRoles('admin'), sectionController.removeStudentFromSection);

// Course assignment routes (admin only)
router.post('/assign-courses', authorizeRoles('admin'), sectionController.assignCoursesToSection);
router.post('/remove-courses', authorizeRoles('admin'), sectionController.removeCoursesFromSection);

// DEPRECATED: Use enhanced teacher assignment system at /api/teacher-assignments
router.post('/assign-teacher-to-section', authorizeRoles('admin'), sectionController.assignTeacherToSection);
router.post('/remove-teacher', authorizeRoles('admin'), sectionController.removeTeacherFromSection);

// Get available students for assignment (admin only)
router.get('/available-students/:schoolId', authorizeRoles('admin'), sectionController.getAvailableStudents);

// Get section by ID (for group chat)
router.get('/:id', authorizeRoles('admin', 'teacher', 'student'), sectionController.getSectionById);

module.exports = router;
