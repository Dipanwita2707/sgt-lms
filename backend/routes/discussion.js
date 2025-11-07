const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, authorizeRoles } = require('../middleware/auth');
const discussionController = require('../controllers/discussionController');
const S3Service = require('../services/s3Service');

// Initialize S3 service
const s3Service = new S3Service();

// Use S3 upload middleware for discussion images
const upload = s3Service.createDiscussionUploadMiddleware('discussions');

// All discussion routes are protected
router.use(auth);

// Get all discussions for admin
router.get('/all', authorizeRoles('admin'), discussionController.getAllDiscussions);

// Course discussion routes
router.get('/course/:courseId', discussionController.getCourseDiscussions);
router.post('/create', upload.single('image'), discussionController.createDiscussion);
router.get('/:discussionId', discussionController.getDiscussion);
router.post('/:discussionId/reply', upload.single('image'), discussionController.addReply);
router.delete('/:discussionId', discussionController.removeDiscussion);
router.delete('/:discussionId/reply/:replyId', discussionController.deleteReply);

module.exports = router;
