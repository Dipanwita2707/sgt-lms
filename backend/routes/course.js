const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const courseController = require('../controllers/courseController');

// Apply authentication middleware to all routes
router.use(auth);

// Course routes
router.get('/', courseController.getAllCourses);
router.get('/school/:schoolId', courseController.getCoursesBySchool);
router.get('/department/:departmentId', courseController.getCoursesByDepartment);
router.get('/:courseId', courseController.getCourseById);
router.post('/', courseController.createCourse);
router.put('/:courseId', courseController.updateCourse);
router.delete('/:courseId', courseController.deleteCourse);

module.exports = router;