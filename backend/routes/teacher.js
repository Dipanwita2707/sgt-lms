const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const teacherController = require('../controllers/teacherController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + ext);
  }
});

// File filter for videos
const fileFilter = (req, file, cb) => {
  // Accept video files only
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
  // No file size limits - allow unlimited video uploads
});

// All routes protected by teacher role (CC is a teacher responsibility, not separate role)
router.use(auth, authorizeRoles('teacher', 'admin'));

// Get all courses assigned to the teacher
router.get('/courses', teacherController.getTeacherCourses);

// Get teacher profile with sections, department, HOD, and Dean info
router.get('/profile', teacherController.getTeacherProfile);

// Get teacher sections with students count
router.get('/sections', teacherController.getTeacherSections);

// Get a specific course details
router.get('/course/:courseId', teacherController.getCourseDetails);

// Get students enrolled in a specific course
router.get('/course/:courseId/students', teacherController.getCourseStudents);

// Get videos for a specific course
router.get('/course/:courseId/videos', teacherController.getCourseVideos);

// Unit management routes for teachers
router.post('/course/:courseId/unit', require('../controllers/unitController').createUnit);
router.get('/course/:courseId/units', require('../controllers/unitController').getCourseUnits);
router.get('/unit/:unitId', require('../controllers/unitController').getUnitById);
router.put('/unit/:unitId', require('../controllers/unitController').updateUnit);
router.delete('/unit/:unitId', require('../controllers/unitController').deleteUnit);

// Upload a video for a course
router.post('/course/:courseId/video', upload.single('video'), teacherController.uploadCourseVideo);

// Teacher: Create announcement for specific sections (requires HOD approval)
router.post('/announcement', teacherController.createSectionAnnouncement);

// Get teacher's announcement history with approval status
router.get('/announcements/history', teacherController.getAnnouncementHistory);

// Legacy route - redirect to new section-based announcement
router.post('/course/:courseId/announcement', (req, res) => {
  res.status(400).json({ 
    message: 'Course-based announcements are deprecated. Use section-based announcements instead.',
    newEndpoint: 'POST /api/teacher/announcement'
  });
});

// Get teacher announcement permission status
router.get('/:teacherId/can-announce', teacherController.getAnnouncementPermission);

// Get announcements for teacher
router.get('/announcement', require('../controllers/announcementController').getAnnouncements);

// Request video removal
router.post('/video/:videoId/removal-request', teacherController.requestVideoRemoval);

// Get all video removal requests
router.get('/video-removal-requests', teacherController.getVideoRemovalRequests);

// Get quiz pools for teacher
router.get('/quiz-pools', require('../controllers/quizPoolController').getTeacherQuizPools);

// Get analytics overview
router.get('/analytics/overview', teacherController.getTeacherAnalyticsOverview);

// Get enrollment trends
router.get('/analytics/trends', teacherController.getTeacherEnrollmentTrends);

// Get analytics for a specific course
router.get('/analytics/course/:courseId', teacherController.getTeacherCourseAnalytics);

// Find a student by registration number
router.get('/analytics/student', teacherController.getStudentByRegNo);

// Get detailed analytics for a specific student
router.get('/analytics/student/:studentId/detailed', teacherController.getStudentDetailedAnalytics);

// Question review endpoints for course coordinators (teachers with coordinator responsibility)
router.post('/question-reviews/approve', require('../controllers/ccController').approveQuestionByQuizAndQuestion);
router.post('/question-reviews/reject', require('../controllers/ccController').rejectQuestionByQuizAndQuestion);
router.post('/question-reviews/flag', require('../controllers/ccController').flagQuestionByQuizAndQuestion);

module.exports = router;
