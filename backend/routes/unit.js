const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Create unit (teacher and admin)
router.post('/', auth, authorizeRoles('teacher', 'admin'), unitController.createUnit);

// Update, delete, and manage units (teacher and admin)
router.put('/:unitId', auth, authorizeRoles('teacher', 'admin'), unitController.updateUnit);
router.delete('/:unitId', auth, authorizeRoles('teacher', 'admin'), unitController.deleteUnit);
router.post('/from-videos', auth, authorizeRoles('teacher', 'admin'), unitController.createUnitFromVideos);
router.post('/:unitId/videos', auth, authorizeRoles('teacher', 'admin'), unitController.addVideoToUnit);
router.delete('/:unitId/videos/:videoId', auth, authorizeRoles('teacher', 'admin'), unitController.removeVideoFromUnit);

// Recalculate unit access for all students in a course
router.post('/recalculate-access/:courseId', auth, authorizeRoles('teacher', 'admin'), unitController.recalculateUnitAccess);

// Common routes
router.get('/course/:courseId', auth, unitController.getCourseUnits);
router.get('/:unitId', auth, unitController.getUnitById);

// Student routes
router.get('/student/course/:courseId', auth, authorizeRoles('student'), unitController.getStudentUnits);

module.exports = router;
