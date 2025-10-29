const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const studentIndividualAnalyticsController = require('../controllers/studentIndividualAnalyticsController');

// Student Individual Analytics Routes
// Accessible by HOD, Dean, and Teacher (within their school only)

// Search for students in the same school
router.get('/search', 
  auth, 
  authorizeRoles('hod', 'dean', 'teacher'), 
  studentIndividualAnalyticsController.searchStudents
);

// Get individual student analytics by registration number or email
router.get('/student', 
  auth, 
  authorizeRoles('hod', 'dean', 'teacher'), 
  studentIndividualAnalyticsController.getStudentAnalytics
);

module.exports = router;
