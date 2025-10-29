const express = require('express');
const router = express.Router();
const teacherAnalyticsController = require('../controllers/teacherAnalyticsController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Get teacher's courses for analytics
router.get('/courses', 
  auth, 
  authorizeRoles('teacher', 'hod', 'dean'), 
  teacherAnalyticsController.getTeacherCourses
);

// Get course-wise student analytics
router.get('/course-analytics', 
  auth, 
  authorizeRoles('teacher', 'hod', 'dean'), 
  teacherAnalyticsController.getCourseAnalytics
);

// Export analytics data
router.get('/export', 
  auth, 
  authorizeRoles('teacher', 'hod', 'dean'), 
  teacherAnalyticsController.exportAnalytics
);

module.exports = router;
