const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const videoUnlockController = require('../controllers/videoUnlockController');

// Protect all routes - require authentication
router.use(auth);

// ============ TEACHER ROUTES ============

// Create video unlock request
router.post('/request', 
  authorizeRoles('teacher'), 
  videoUnlockController.createUnlockRequest
);

// Get teacher's unlock requests
router.get('/teacher/requests', 
  authorizeRoles('teacher'), 
  videoUnlockController.getTeacherUnlockRequests
);

// Get students for teacher (for unlock request dropdown)
router.get('/teacher/students', 
  authorizeRoles('teacher'), 
  videoUnlockController.getTeacherStudents
);

// Get courses for a specific student (teacher access)
router.get('/student/:studentId/courses', 
  authorizeRoles('teacher'), 
  videoUnlockController.getStudentCourses
);

// Get units for a specific course
router.get('/course/:courseId/units', 
  authorizeRoles('teacher'), 
  videoUnlockController.getCourseUnits
);

// Get videos for a specific unit
router.get('/unit/:unitId/videos', 
  authorizeRoles('teacher'), 
  videoUnlockController.getUnitVideos
);

// Cancel pending unlock request
router.patch('/request/:requestId/cancel', 
  authorizeRoles('teacher'), 
  videoUnlockController.cancelUnlockRequest
);

// ============ HOD ROUTES ============

// Get pending requests for HOD approval
router.get('/hod/pending', 
  authorizeRoles('hod', 'admin'), 
  videoUnlockController.getPendingRequestsForHOD
);

// Approve unlock request
router.patch('/request/:requestId/approve', 
  authorizeRoles('hod', 'admin'), 
  videoUnlockController.approveUnlockRequest
);

// Reject unlock request
router.patch('/request/:requestId/reject', 
  authorizeRoles('hod', 'admin'), 
  videoUnlockController.rejectUnlockRequest
);

// ============ STUDENT ACCESS ROUTES ============

// Check if specific video is unlocked for student
router.get('/check/:studentId/:videoId', 
  authorizeRoles('student', 'teacher', 'hod', 'admin'), 
  videoUnlockController.checkVideoUnlock
);

// Get active unlocks for a student
router.get('/student/:studentId/active', 
  authorizeRoles('student', 'teacher', 'hod', 'admin'), 
  videoUnlockController.getStudentActiveUnlocks
);

// ============ STATISTICS & ADMIN ROUTES ============

// Get unlock statistics
router.get('/stats', 
  authorizeRoles('teacher', 'hod', 'admin'), 
  videoUnlockController.getUnlockStats
);

// Cleanup expired requests (admin only)
router.post('/cleanup', 
  authorizeRoles('admin'), 
  videoUnlockController.cleanupExpiredRequests
);

module.exports = router;