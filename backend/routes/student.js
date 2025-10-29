const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// All routes protected by student role
router.use(auth, authorizeRoles('student'));

// Get all courses assigned to student with progress info
router.get('/courses', studentController.getStudentCourses);

// Get videos for a course
router.get('/course/:courseId/videos', studentController.getCourseVideos);

// Update watch history for a video
router.post('/video/:videoId/watch', studentController.updateWatchHistory);

// Get student's watch history across all courses
router.get('/watch-history', studentController.getStudentWatchHistory);

// Get video resume position for a student
router.get('/video/:videoId/resume-position', studentController.getVideoResumePosition);

// Get detailed progress for a specific course
router.get('/course/:courseId/progress', studentController.getCourseProgress);

// Get student's quiz pool attempts for a course
router.get('/course/:courseId/quiz-pool-attempts', studentController.getStudentQuizPoolAttempts);

// Get all quiz results for a student across all courses or for a specific course
router.get('/quiz-results/:courseId?', studentController.getStudentQuizResults);

// Get all deadline warnings across all courses for the student
router.get('/deadline-warnings', studentController.getAllDeadlineWarnings);

// Get deadline warnings for a course
router.get('/course/:courseId/deadline-warnings', studentController.getDeadlineWarnings);

// Mark deadline warning as seen
router.post('/course/:courseId/unit/:unitId/deadline-warning-seen', studentController.markDeadlineWarningSeen);

module.exports = router;
