const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, authorizeRoles } = require('../middleware/auth');
const discussionController = require('../controllers/discussionController');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/discussions');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filter files to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

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
