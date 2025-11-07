const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const certificateController = require('../controllers/certificateController');
const { auth, authorizeRoles } = require('../middleware/auth');
const S3Service = require('../services/s3Service');

// Initialize S3 service
const s3Service = new S3Service();

// Use S3 upload middleware for signature uploads
const upload = s3Service.createSignatureUploadMiddleware('signatures');

// HOD Routes
router.post('/signature/upload', 
  auth, 
  authorizeRoles('hod', 'dean', 'admin'), 
  upload.single('signature'), 
  certificateController.uploadSignature
);

router.get('/signature/status', 
  auth, 
  authorizeRoles('hod', 'dean', 'admin'), 
  certificateController.getSignatureStatus
);

router.post('/activate', 
  auth, 
  authorizeRoles('hod'), 
  certificateController.activateCertificates
);

router.get('/status', 
  auth, 
  authorizeRoles('hod'), 
  certificateController.getCertificateStatus
);

// Student Routes
router.get('/my-certificates', 
  auth, 
  authorizeRoles('student'), 
  certificateController.getStudentCertificates
);

router.get('/download/:certificateId', 
  auth, 
  authorizeRoles('student'), 
  certificateController.downloadCertificate
);

// Public Verification Routes (NO AUTH REQUIRED - for external verification)
router.get('/verify/hash/:hash', 
  certificateController.verifyCertificate
);

router.get('/verify/number/:certificateNumber', 
  certificateController.verifyCertificateByNumber
);

// Admin Routes
router.post('/revoke/:certificateId', 
  auth, 
  authorizeRoles('admin'), 
  certificateController.revokeCertificate
);

router.get('/chain/status', 
  auth, 
  authorizeRoles('admin', 'dean'), 
  certificateController.getCertificateChainStatus
);

module.exports = router;
