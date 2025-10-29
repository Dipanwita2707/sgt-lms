const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  checkUnitQuizAvailability,
  generateUnitQuiz,
  submitUnitQuiz,
  getQuizResults,
  getQuizAttempt
} = require('../controllers/unitQuizController');

// Check if unit quiz is available
router.get('/unit/:unitId/quiz/availability', auth, checkUnitQuizAvailability);

// Generate random quiz for unit
router.post('/unit/:unitId/quiz/generate', auth, generateUnitQuiz);

// Get quiz attempt details
router.get('/quiz/attempt/:attemptId', auth, getQuizAttempt);

// Submit quiz answers
router.post('/quiz-attempt/:attemptId/submit', auth, submitUnitQuiz);

// Get quiz results
router.get('/quiz-attempt/:attemptId/results', auth, getQuizResults);

module.exports = router;
