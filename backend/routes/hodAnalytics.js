const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const hodAnalyticsController = require('../controllers/hodAnalyticsController');

// HOD Analytics Routes

// Get department overview analytics
router.get('/department-analytics', 
  auth, 
  authorizeRoles('hod'), 
  hodAnalyticsController.getDepartmentAnalytics
);

// Get course-wise detailed analytics
router.get('/course-analytics', 
  auth, 
  authorizeRoles('hod'), 
  hodAnalyticsController.getHODCourseAnalytics
);

module.exports = router;
