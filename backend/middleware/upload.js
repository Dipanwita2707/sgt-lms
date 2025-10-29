const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create middleware for file uploads based on type
module.exports = function(type) {
  // Define directory based on type
  const directory = path.join(__dirname, '..', 'uploads', type);

  // Create directory if it doesn't exist
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  // Configure storage
  const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, directory);
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });

  // Define file filter based on type
  const fileFilter = function(req, file, cb) {
    if (type === 'documents') {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only document files are allowed'), false);
      }
    } else if (type === 'quizzes') {
      // For quizzes, allow CSV files
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed for quizzes'), false);
      }
    } else {
      // Default: accept all files
      cb(null, true);
    }
  };

  // Set file size limits based on type
  const limits = {};
  if (type === 'documents') {
    limits.fileSize = 10 * 1024 * 1024; // 10MB for documents
  } else if (type === 'quizzes') {
    limits.fileSize = 5 * 1024 * 1024; // 5MB for quizzes
  }
  // For videos and other types: no size limits

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: type === 'videos' ? {} : limits  // No limits for videos
  });
};
