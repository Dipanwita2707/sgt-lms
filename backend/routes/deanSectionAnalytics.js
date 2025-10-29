const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const deanSectionAnalyticsController = require('../controllers/deanSectionAnalyticsController');

/**
 * @route   GET /api/dean-section-analytics/sections
 * @desc    Get all sections for dean's school
 * @access  Dean only
 */
router.get('/sections', auth, authorizeRoles('dean'), deanSectionAnalyticsController.getSections);

/**
 * @route   GET /api/dean-section-analytics/section/:sectionId
 * @desc    Get detailed analytics for a specific section
 * @access  Dean only
 */
router.get('/section/:sectionId', auth, authorizeRoles('dean'), deanSectionAnalyticsController.getSectionAnalytics);

module.exports = router;
