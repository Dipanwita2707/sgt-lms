const express = require('express');
const router = express.Router();
const ccController = require('../controllers/ccController');
const { auth, authorizeRoles } = require('../middleware/auth');
const { requireCCRole, requireCourseCoordination } = require('../middleware/ccAuth');

// Check if user is currently a CC (for frontend sidebar display)
router.get('/status', auth, authorizeRoles('teacher', 'hod', 'admin'), ccController.getCCStatus);

// All CC routes require auth and CC role verification
router.get('/courses', auth, authorizeRoles('teacher', 'hod', 'admin'), requireCCRole, ccController.getAssignedCourses);

// Review queue and actions for CC (teachers who are course coordinators are allowed)
router.get('/reviews/pending', auth, authorizeRoles('teacher', 'hod', 'admin'), requireCCRole, ccController.getPendingReviews);
router.post('/reviews/:reviewId/approve', auth, authorizeRoles('teacher', 'hod', 'admin'), requireCCRole, ccController.approveQuestion);
router.post('/reviews/:reviewId/flag', auth, authorizeRoles('teacher', 'hod', 'admin'), requireCCRole, ccController.flagQuestion);

module.exports = router;
