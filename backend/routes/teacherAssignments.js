const express = require('express');
const router = express.Router();
const teacherAssignmentController = require('../controllers/teacherAssignmentController');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// GET /api/teacher-assignments/teacher/:teacherId - Get teacher's assignments
router.get('/teacher/:teacherId', teacherAssignmentController.getTeacherAssignments);

// POST /api/teacher-assignments/assign - Assign teacher to courses
router.post('/assign', teacherAssignmentController.assignTeacherToCourses);

// GET /api/teacher-assignments/teachers - Get available teachers
router.get('/teachers', teacherAssignmentController.getAvailableTeachers);

// GET /api/teacher-assignments/teachers/course/:courseId - Get available teachers for course
router.get('/teachers/course/:courseId', teacherAssignmentController.getAvailableTeachersForCourse);

// GET /api/teacher-assignments/section/:sectionId - Get section assignments
router.get('/section/:sectionId', teacherAssignmentController.getSectionAssignments);

// POST /api/teacher-assignments/remove - Remove assignment
router.post('/remove', teacherAssignmentController.removeAssignment);

// GET /api/teacher-assignments/validate - Validate all assignments
router.get('/validate', teacherAssignmentController.validateTeacherAssignments);

module.exports = router;