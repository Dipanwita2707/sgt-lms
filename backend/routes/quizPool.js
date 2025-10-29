const express = require('express');
const router = express.Router();
const quizPoolController = require('../controllers/quizPoolController');
const { auth } = require('../middleware/auth');
const { isAdmin, isTeacher, isTeacherOrAdmin, isStudent, isTeacherCcOrAdmin } = require('../middleware/authMiddleware');

// Create a new quiz pool (teacher, admin)
router.post('/', auth, isTeacherOrAdmin, quizPoolController.createQuizPool);

// Add a quiz to a pool (teacher, admin)
router.post('/:quizPoolId/add-quiz', auth, isTeacherOrAdmin, quizPoolController.addQuizToPool);

// Remove a quiz from a pool (teacher, admin)
router.delete('/:quizPoolId/quizzes/:quizId', auth, isTeacherOrAdmin, quizPoolController.removeQuizFromPool);

// Get all quiz pools for a course (teacher, cc, admin)
router.get('/course/:courseId', auth, isTeacherCcOrAdmin, quizPoolController.getCourseQuizPools);

// Get quiz pool details (teacher, admin)
router.get('/:quizPoolId/details', auth, isTeacherOrAdmin, quizPoolController.getQuizPoolDetails);

// Get quiz pool questions with answers (teacher, cc, admin)
router.get('/:quizPoolId/questions', auth, isTeacherCcOrAdmin, quizPoolController.getQuizPoolQuestions);

// Get quiz pool for student (student)
router.get('/:quizPoolId/student', auth, isStudent, quizPoolController.getQuizPoolForStudent);

// Submit quiz pool attempt (student)
router.post('/:quizPoolId/submit', auth, isStudent, quizPoolController.submitQuizPoolAttempt);

// Get quiz pool analytics (teacher, admin)
router.get('/:quizPoolId/analytics', auth, isTeacherOrAdmin, quizPoolController.getQuizPoolAnalytics);

module.exports = router;
