const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const departmentController = require('../controllers/departmentController');

// Apply authentication middleware to all routes
router.use(auth);

// Department routes
router.post('/', departmentController.createDepartment);
router.get('/', departmentController.getAllDepartments);
router.get('/school/:schoolId', departmentController.getDepartmentsBySchool);
router.get('/eligible-hods', departmentController.getEligibleHods);
router.get('/:departmentId', departmentController.getDepartmentById);
router.put('/:departmentId', departmentController.updateDepartment);
router.delete('/:departmentId', departmentController.deleteDepartment);
router.get('/:departmentId/dashboard', departmentController.getDepartmentDashboard);
router.get('/:departmentId/teachers', departmentController.getDepartmentTeachers);

module.exports = router;
