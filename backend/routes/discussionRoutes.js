const express = require('express');
const router = express.Router();
const discussionController = require('../controllers/discussionController');
const { authenticateToken, isAdmin, isTeacher, isStudent } = require('../middleware/authMiddleware');
const upload = require('../middleware/fileUploadMiddleware');

// Setup file upload middleware for discussion images
const discussionUpload = upload('discussions');

// Get all discussions (admin only)
router.get('/all', authenticateToken, discussionController.getAllDiscussions);

// Get unanswered discussions for students
router.get('/unanswered', authenticateToken, discussionController.getUnansweredDiscussions);

// Get discussions for a specific course (accessible to students enrolled in the course, teachers assigned to the course, and admins)
router.get('/course/:courseId', authenticateToken, discussionController.getCourseDiscussions);

// Get a specific discussion with replies
router.get('/:discussionId', authenticateToken, discussionController.getDiscussion);

// Create a new discussion in a course
router.post('/create', 
  authenticateToken, 
  discussionUpload.single('image'), 
  discussionController.createDiscussion
);

// Add a reply to a discussion
router.post('/:discussionId/reply', 
  authenticateToken, 
  discussionUpload.single('image'), 
  discussionController.addReply
);

// Toggle resolved status of a discussion
router.patch('/:discussionId/resolve', 
  authenticateToken, 
  discussionController.toggleResolved
);

// Toggle pin status of a discussion (admin/teacher only)
router.patch('/:discussionId/pin', 
  authenticateToken, 
  discussionController.togglePin
);

// Mark a reply as an answer (teacher/admin only)
router.patch('/:discussionId/reply/:replyId/answer', 
  authenticateToken, 
  discussionController.markReplyAsAnswer
);

// Delete a discussion
router.delete('/:id', 
  authenticateToken, 
  discussionController.removeDiscussion
);

// Delete a reply
router.delete('/:discussionId/reply/:replyId', 
  authenticateToken, 
  discussionController.deleteReply
);

module.exports = router;
