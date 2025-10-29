const express = require('express');
const router = express.Router();
const { getDepartmentCourses, getCourseAnalytics } = require('../controllers/deanCourseController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Get courses for a department
router.get('/courses/:departmentId', auth, authorizeRoles('dean'), getDepartmentCourses);

// Get course analytics
router.get('/course-analytics/:courseId', auth, authorizeRoles('dean'), getCourseAnalytics);

module.exports = router;
