const express = require('express');
const router = express.Router();
const hierarchyController = require('../controllers/hierarchyController');
const { auth, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Administrative hierarchy management (admin only)
router.post('/assign-dean', authorizeRoles('admin'), hierarchyController.assignDeanToSchool);
router.post('/remove-dean', authorizeRoles('admin'), hierarchyController.removeDeanFromSchool);
router.post('/assign-hod', authorizeRoles('admin'), hierarchyController.assignHODToDepartment);
router.post('/remove-hod', authorizeRoles('admin'), hierarchyController.removeHODFromDepartment);
router.post('/assign-teacher', authorizeRoles('admin', 'dean', 'hod'), hierarchyController.assignTeacherToDepartment);

// Section management
router.post('/create-section', authorizeRoles('admin', 'dean', 'hod'), hierarchyController.createSectionWithCourses);
router.post('/assign-students', authorizeRoles('admin', 'dean', 'hod'), hierarchyController.assignStudentsToSection);

// Information and reporting
router.get('/overview', authorizeRoles('admin', 'dean', 'hod'), hierarchyController.getHierarchyOverview);
router.get('/student/:studentId/path', hierarchyController.getStudentAcademicPath);
router.get('/teacher/:teacherId/load', hierarchyController.getTeacherTeachingLoad);
router.get('/my-teaching-assignments', authorizeRoles('teacher', 'hod', 'dean'), hierarchyController.getMyTeachingAssignments);

// Utility routes for dropdowns
router.get('/available-deans/:schoolId', authorizeRoles('admin'), hierarchyController.getAvailableDeansForSchool);
router.get('/available-hods/:departmentId', authorizeRoles('admin'), hierarchyController.getAvailableHODsForDepartment);
router.get('/students-by-school/:schoolId', authorizeRoles('admin', 'dean', 'hod'), hierarchyController.getStudentsBySchool);
router.get('/courses-by-department/:departmentId', authorizeRoles('admin', 'dean', 'hod'), hierarchyController.getCoursesByDepartment);
router.get('/teachers-by-department/:departmentId', authorizeRoles('admin', 'dean', 'hod'), hierarchyController.getTeachersByDepartment);
router.get('/teachers-by-course/:courseId', authorizeRoles('admin', 'dean', 'hod'), hierarchyController.getTeachersByCourse);

module.exports = router;