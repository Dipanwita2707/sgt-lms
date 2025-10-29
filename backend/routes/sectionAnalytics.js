const express = require('express');
const router = express.Router();
const sectionAnalyticsController = require('../controllers/sectionAnalyticsController');
const { auth, authorizeRoles } = require('../middleware/auth');

/**
 * @route   GET /api/section-analytics/sections
 * @desc    Get all sections for dean's school
 * @access  Private (Dean only)
 */
router.get('/sections', auth, authorizeRoles('dean'), 
  sectionAnalyticsController.getDeanSections
);

/**
 * @route   GET /api/section-analytics/section-details
 * @desc    Get detailed analytics for a specific section
 * @access  Private (Dean only)
 */
router.get('/section-details', auth, authorizeRoles('dean'), 
  sectionAnalyticsController.getSectionAnalytics
);

module.exports = router;
