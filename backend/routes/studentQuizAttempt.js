// Backend route to delete a quiz attempt by ID (for destroying incomplete attempts)
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const QuizAttempt = require('../models/QuizAttempt');

// DELETE /api/student/quiz-attempt/:attemptId
router.delete('/quiz-attempt/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Quiz attempt not found' });
    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Not your quiz attempt' });
    }
    if (attempt.completedAt) {
      return res.status(400).json({ message: 'Cannot delete a completed quiz attempt' });
    }
    await attempt.deleteOne();
    res.json({ message: 'Incomplete quiz attempt deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
