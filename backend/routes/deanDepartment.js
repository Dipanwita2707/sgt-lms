const express = require('express');
const router = express.Router();
const deanDepartmentController = require('../controllers/deanDepartmentController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Get list of departments
router.get('/departments', auth, authorizeRoles('dean'), deanDepartmentController.getDepartments);

// Get comprehensive analytics for a specific department
router.get('/department-analytics/:departmentId', auth, authorizeRoles('dean'), deanDepartmentController.getDepartmentAnalytics);

module.exports = router;
