const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const schoolController = require('../controllers/schoolController');

// Apply authentication middleware to all routes
router.use(auth);

// School routes
router.post('/', schoolController.createSchool);
router.get('/', schoolController.getAllSchools);
router.get('/eligible-deans', schoolController.getEligibleDeans);
router.get('/:schoolId', schoolController.getSchoolById);
router.put('/:schoolId', schoolController.updateSchool);
router.delete('/:schoolId', schoolController.deleteSchool);
router.get('/:schoolId/dashboard', schoolController.getSchoolDashboard);

module.exports = router;
