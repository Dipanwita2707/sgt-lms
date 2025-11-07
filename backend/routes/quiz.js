const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const quizPoolController = require('../controllers/quizPoolController');
const { auth, authorizeRoles } = require('../middleware/auth');
const S3Service = require('../services/s3Service');
const { logDetailedOperation } = require('../middleware/detailedAuditMiddleware');

// Initialize S3 service
const s3Service = new S3Service();

// Create CSV upload middleware for quizzes
const upload = s3Service.createUploadMiddleware('quizzes', (req, file, cb) => {
  // Only allow CSV files for quizzes
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed for quizzes'), false);
  }
});

// Quiz template
router.get('/template', auth, authorizeRoles('teacher', 'admin'), quizController.createQuizTemplate);

// Quiz routes
router.post('/upload', auth, authorizeRoles('teacher', 'admin'), upload.single('file'), logDetailedOperation('UPLOAD_QUIZ'), quizController.uploadQuiz);
router.get('/course/:courseId', auth, quizController.getCourseQuizzes);
router.get('/analytics/:quizId', auth, authorizeRoles('teacher', 'admin'), quizController.getQuizAnalytics);
router.get('/details/:quizId', auth, authorizeRoles('teacher', 'admin'), quizController.getQuizDetails);
router.get('/teacher/pools', auth, authorizeRoles('teacher'), quizController.getTeacherQuizPools);
router.get('/teacher/uploaded-questions/:courseId', auth, authorizeRoles('teacher'), quizController.getTeacherUploadedQuestions);

// Student quiz routes
router.get('/unit/:unitId/student', auth, authorizeRoles('student'), quizController.getUnitQuizForStudent);
router.post('/:quizId/attempt', auth, authorizeRoles('student'), logDetailedOperation('CREATE_QUIZ_ATTEMPT'), quizController.createQuizAttempt);
router.get('/attempt/:attemptId', auth, authorizeRoles('student'), quizController.getQuizAttempt);
router.post('/attempt/:attemptId/submit', auth, authorizeRoles('student'), logDetailedOperation('SUBMIT_QUIZ'), quizController.submitQuizAttempt);
router.post('/pool/:quizPoolId/submit', auth, authorizeRoles('student'), logDetailedOperation('SUBMIT_QUIZ'), quizController.submitQuizPoolAttempt);
router.get('/student/:studentId/results', auth, quizController.getStudentQuizResults);

// Quiz pool routes
router.post('/pool/create', auth, authorizeRoles('teacher', 'admin'), quizPoolController.createQuizPool);
router.post('/pool/:quizPoolId/add-quiz', auth, authorizeRoles('teacher', 'admin'), quizPoolController.addQuizToPool);
router.delete('/pool/:quizPoolId/quiz/:quizId', auth, authorizeRoles('teacher', 'admin'), quizPoolController.removeQuizFromPool);
router.get('/pool/course/:courseId', auth, quizPoolController.getCourseQuizPools);
router.get('/pool/:quizPoolId', auth, quizPoolController.getQuizPoolDetails);
router.get('/pool/:quizPoolId/analytics', auth, authorizeRoles('teacher', 'admin'), quizPoolController.getQuizPoolAnalytics);

module.exports = router;
