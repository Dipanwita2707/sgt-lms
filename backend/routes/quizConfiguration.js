const express = require('express');
const router = express.Router();
const quizConfigurationController = require('../controllers/quizConfigurationController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Get quiz configuration for a specific unit
router.get(
  '/:courseId/:sectionId/:unitId',
  auth,
  authorizeRoles('teacher', 'hod', 'dean'),
  quizConfigurationController.getQuizConfiguration
);

// Get all quiz configurations for a course
router.get(
  '/course/:courseId',
  auth,
  authorizeRoles('hod', 'dean'),
  quizConfigurationController.getCourseQuizConfigurations
);

// Create or update quiz configuration
router.post(
  '/:courseId/:sectionId/:unitId',
  auth,
  authorizeRoles('teacher', 'hod', 'dean'),
  quizConfigurationController.createOrUpdateQuizConfiguration
);

// Bulk update configurations (HOD/Dean only)
router.post(
  '/bulk/:courseId/:sectionId',
  auth,
  authorizeRoles('hod', 'dean'),
  quizConfigurationController.bulkUpdateConfigurations
);

// Reset to default
router.delete(
  '/:courseId/:sectionId/:unitId',
  auth,
  authorizeRoles('teacher', 'hod', 'dean'),
  quizConfigurationController.resetToDefault
);

module.exports = router;
