const express = require('express');
const router = express.Router();
const readingMaterialController = require('../controllers/readingMaterialController');
const { auth, authorizeRoles } = require('../middleware/auth');
const S3Service = require('../services/s3Service');

// Initialize S3 service
const s3Service = new S3Service();

// Use S3 upload middleware for reading materials
const upload = s3Service.createMaterialUploadMiddleware('materials');

// Teacher routes
router.post('/', 
  auth, 
  authorizeRoles('teacher', 'admin'), 
  upload.single('file'), 
  readingMaterialController.createReadingMaterial
);

router.put('/:materialId', 
  auth, 
  authorizeRoles('teacher', 'admin'), 
  upload.single('file'), 
  readingMaterialController.updateReadingMaterial
);

router.delete('/:materialId', 
  auth, 
  authorizeRoles('teacher', 'admin'), 
  readingMaterialController.deleteReadingMaterial
);

// Common routes
router.get('/:materialId', auth, readingMaterialController.getReadingMaterial);
router.get('/unit/:unitId', auth, readingMaterialController.getUnitReadingMaterials);

// Student routes
router.post('/:materialId/complete', 
  auth, 
  authorizeRoles('student'), 
  readingMaterialController.markAsCompleted
);

router.get('/student/course/:courseId', 
  auth, 
  authorizeRoles('student'), 
  readingMaterialController.getStudentReadingMaterialStatus
);

module.exports = router;
