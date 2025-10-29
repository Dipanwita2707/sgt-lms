const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const certificateController = require('../controllers/certificateController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Configure multer for signature uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/signatures/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'signature-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  }
});

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
