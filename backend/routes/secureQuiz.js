const express = require('express');
const router = express.Router();
const secureQuizController = require('../controllers/secureQuizController');
const { auth } = require('../middleware/auth');

// Create a new secure quiz attempt
router.post('/quiz/:quizId/attempt', auth, secureQuizController.createSecureQuizAttempt);

// Get secure quiz attempt details
router.get('/quiz/attempt/:attemptId', auth, secureQuizController.getSecureQuizAttempt);

// Submit secure quiz attempt
router.post('/quiz-attempt/:attemptId/submit', auth, secureQuizController.submitSecureQuizAttempt);

// Get student security violations (for teachers/admins)
router.get('/security-violations/:studentId', auth, secureQuizController.getStudentSecurityViolations);

module.exports = router;
