
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for large video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'admin-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: Infinity  // Allow unlimited file size for video uploads
  }
});

const { auth, authorizeRoles, switchRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const videoController = require('../controllers/videoController');
const analyticsController = require('../controllers/analyticsController');
const settingController = require('../controllers/settingController');
const unitController = require('../controllers/unitController');
const { authorizePermissions } = require('../middleware/auth');
const { logDetailedOperation } = require('../middleware/detailedAuditMiddleware');

// Debug route (no auth for testing)
router.get('/debug/videos', adminController.debugVideos);

// All routes protected by admin role
router.use(auth, authorizeRoles('admin'));

// Dashboard activity feed (basic - for backwards compatibility)
router.get('/audit-logs/recent', adminController.getRecentAuditLogs);

// COMPREHENSIVE AUDIT LOG ROUTES
router.get('/audit-logs/advanced', adminController.getAdvancedAuditLogs);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/statistics', adminController.getAuditLogStatistics);
router.get('/audit-logs/suspicious', adminController.getSuspiciousActivities);
router.get('/audit-logs/pending-reviews', adminController.getPendingReviews);
router.put('/audit-logs/:id/review', adminController.markAsReviewed);
router.get('/audit-logs/export', adminController.exportAuditLogs);
router.get('/audit-logs/user/:userId', adminController.getUserActivityHistory);

// Bulk messaging (email or notification)
router.post('/bulk-message', authorizeRoles('admin'), adminController.bulkMessage);
// Student & Teacher analytics
router.get('/analytics/student/:studentId/heatmap', analyticsController.studentHeatmap);
router.get('/analytics/teacher/:teacherId/performance', analyticsController.teacherPerformance);
router.get('/analytics/export', analyticsController.exportAnalyticsCSV);
// Super Admin: Add admin
router.post('/add-admin', authorizeRoles('admin'), adminController.addAdmin);
// Global settings
router.get('/settings', settingController.getSettings);
router.post('/settings', logDetailedOperation('UPDATE_SETTINGS'), settingController.updateSetting);
// Change own password
router.post('/change-password', logDetailedOperation('CHANGE_PASSWORD'), adminController.changeOwnPassword);
// Bulk assign courses via CSV
router.post('/course/bulk-assign', upload.single('file'), logDetailedOperation('BULK_ASSIGN_COURSES'), adminController.bulkAssignCourses);
// Bulk upload courses via CSV
router.post('/course/bulk', upload.single('file'), logDetailedOperation('BULK_UPLOAD_COURSES'), adminController.bulkUploadCourses);
// Get all courses
router.get('/courses', adminController.getAllCourses);
// Get courses by department
router.get('/courses/department/:departmentId', adminController.getCoursesByDepartment);
// Get all students
router.get('/students', adminController.getAllStudents);
// Get all users
router.get('/users', adminController.getAllUsers);
// Get all schools
router.get('/schools', async (req, res) => {
  try {
    const School = require('../models/School');
    const schools = await School.find({}).sort({ name: 1 });
    res.json(schools);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get all departments  
router.get('/departments', async (req, res) => {
  try {
    const Department = require('../models/Department');
    const departments = await Department.find({}).populate('school', 'name code').sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get teachers by department (for HOD)
router.get('/teachers/department', adminController.getTeachersByDepartment);
// Super admin: Create announcement for teachers and/or students
router.post('/announcement', logDetailedOperation('CREATE_ANNOUNCEMENT'), adminController.createAnnouncement);
// Edit announcement
router.put('/announcement/:id', logDetailedOperation('UPDATE_ANNOUNCEMENT'), adminController.updateAnnouncement);
// Delete announcement
router.delete('/announcement/:id', logDetailedOperation('DELETE_ANNOUNCEMENT'), adminController.deleteAnnouncement);

// Admin: Toggle teacher announcement permission
router.patch('/teacher/:teacherId/announce-permission', adminController.toggleTeacherAnnounce);

// Get all announcements
router.get('/announcement', require('../controllers/announcementController').getAnnouncements);

// Search teachers (for dropdown)
router.get('/teachers/search', adminController.searchTeachers);

// Teacher management
router.post('/teacher', authorizePermissions('manage_teachers'), logDetailedOperation('CREATE_TEACHER'), adminController.addTeacher);
router.post('/teacher/bulk', authorizePermissions('manage_teachers'), upload.single('file'), logDetailedOperation('BULK_UPLOAD_TEACHERS'), adminController.bulkUploadTeachers);
router.post('/teacher/reset-password', authorizePermissions('manage_teachers'), logDetailedOperation('RESET_PASSWORD'), adminController.resetTeacherPassword);
router.patch('/teacher/:id/deactivate', authorizePermissions('manage_teachers'), logDetailedOperation('DEACTIVATE_TEACHER'), adminController.deactivateTeacher);
router.get('/teachers', adminController.getAllTeachers);

// Student management
router.post('/student', logDetailedOperation('CREATE_STUDENT'), adminController.createStudent);
router.post('/student/bulk', upload.single('file'), logDetailedOperation('BULK_UPLOAD_STUDENTS'), adminController.bulkUploadStudents);
router.post('/student/assign-courses', logDetailedOperation('ASSIGN_COURSES_TO_STUDENT'), adminController.assignCourses); // batch assign
router.get('/student/:studentId/assignment-history', adminController.getAssignmentHistory);
router.patch('/student/:id', logDetailedOperation('UPDATE_STUDENT'), adminController.editStudent);
router.delete('/student/:id', logDetailedOperation('DELETE_STUDENT'), adminController.removeStudent);

// Course management
router.post('/course', logDetailedOperation('CREATE_COURSE'), adminController.createCourse);
router.patch('/course/:id', logDetailedOperation('UPDATE_COURSE'), adminController.editCourse);
router.delete('/course/:id', logDetailedOperation('DELETE_COURSE'), adminController.deleteCourse);

// Unit management
router.post('/course/:id/unit', logDetailedOperation('CREATE_UNIT'), require('../controllers/unitController').createUnit);
router.get('/course/:id/units', require('../controllers/unitController').getCourseUnits);

// Unit deadline management
router.patch('/unit/:unitId', logDetailedOperation('UPDATE_UNIT'), require('../controllers/unitController').updateUnit);
router.patch('/unit/:unitId/deadline', logDetailedOperation('UPDATE_UNIT_DEADLINE'), require('../controllers/unitController').updateUnitDeadline);
router.get('/unit/:unitId/deadline', require('../controllers/unitController').getUnitDeadline);

// Course details, videos, and students - new endpoints
router.get('/course/:id/details', adminController.getCourseDetails);
router.get('/course/:id/videos', adminController.getCourseVideos);
router.get('/course/:id/students', adminController.getCourseStudents);
router.get('/video/:id/analytics', videoController.getVideoAnalytics);

// REMOVED: Direct course-teacher assignment - teachers are only connected through sections
router.post('/course/:id/assign-teacher', async (req, res) => {
	return res.status(410).json({
		success: false,
		message: 'Direct course-teacher assignment has been deprecated. Teachers are now only connected to courses through sections.',
		newEndpoint: '/api/teacher-assignments/assign',
		documentation: 'Use the enhanced teacher assignment system that connects teachers to courses through sections only.'
	});
});

// Get available courses for section assignment
router.get('/courses/available', async (req, res) => {
	try {
		const { schoolId, departmentId } = req.query;
		
		if (!schoolId) {
			return res.status(400).json({ message: 'School ID is required' });
		}
		
		const query = { school: schoolId };
		if (departmentId) {
			query.department = departmentId;
		}
		
		const courses = await require('../models/Course').find(query)
			.populate('department', 'name code')
			.populate('school', 'name code')
			.sort({ title: 1 });
			
		res.json(courses);
	} catch (error) {
		console.error('Error getting available courses:', error);
		res.status(500).json({ message: 'Failed to get available courses' });
	}
});

// Video management
router.post('/video/upload', upload.single('file'), logDetailedOperation('UPLOAD_VIDEO'), videoController.uploadVideo);
router.delete('/video/:id', logDetailedOperation('DELETE_VIDEO'), videoController.removeVideo);
router.patch('/video/:id/warn', logDetailedOperation('WARN_VIDEO'), videoController.warnVideo);

// Analytics
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/trends', analyticsController.getEnrollmentTrends);
router.get('/analytics/heatmap', analyticsController.getActivityHeatmap);
router.get('/analytics/top-courses', analyticsController.getTopCourses);

// Enhanced/detailed analytics endpoints
router.get('/analytics/detailed/overview', analyticsController.getDetailedOverview);
router.get('/analytics/detailed/trends', analyticsController.getDetailedEnrollmentTrends);
router.get('/analytics/detailed/heatmap', analyticsController.getDetailedActivityHeatmap);
router.get('/analytics/course/:courseId', analyticsController.getCourseAnalytics);
router.get('/analytics/student/:studentId', analyticsController.studentAnalytics); // Legacy endpoint
router.get('/analytics/student/:studentId/detailed', analyticsController.getStudentDetailedAnalytics); // New detailed endpoint
router.get('/analytics/student', analyticsController.searchStudent); // ?regNo=...
router.get('/analytics/teacher/:teacherId', analyticsController.getTeacherAnalytics);

// Dean Management Routes
router.post('/deans', logDetailedOperation('CREATE_DEAN'), adminController.createDean);
router.get('/deans', adminController.getAllDeans);
router.put('/deans/:id', logDetailedOperation('UPDATE_DEAN'), adminController.updateDean);
router.delete('/deans/:id', logDetailedOperation('DELETE_DEAN'), adminController.deleteDean);
router.post('/deans/bulk', upload.single('file'), logDetailedOperation('BULK_UPLOAD_DEANS'), adminController.bulkUploadDeans);
// Reset dean password
router.post('/deans/reset-password', logDetailedOperation('RESET_PASSWORD'), adminController.resetDeanPassword);

// HOD Management Routes
router.post('/hods', logDetailedOperation('CREATE_HOD'), adminController.createHOD);
router.get('/hods', adminController.getAllHODs);
router.put('/hods/:id', logDetailedOperation('UPDATE_HOD'), adminController.updateHOD);
router.delete('/hods/:id', logDetailedOperation('DELETE_HOD'), adminController.deleteHOD);
router.post('/hods/bulk', upload.single('file'), logDetailedOperation('BULK_UPLOAD_HODS'), adminController.bulkUploadHODs);

// Security lock management for unit quizzes
const StudentProgress = require('../models/StudentProgress');

router.get('/course/:courseId/unit/:unitId/locks', async (req, res) => {
	try {
		const { courseId, unitId } = req.params;
		const locks = await StudentProgress.find({ course: courseId, 'units.unitId': unitId })
			.populate('student', 'name email regNo')
			.select('student units.unitId units.securityLock');
		const result = locks.map(doc => {
			const unit = doc.units.find(u => u.unitId.toString() === unitId);
			return {
				student: doc.student,
				locked: unit?.securityLock?.locked || false,
				reason: unit?.securityLock?.reason || '',
				lockedAt: unit?.securityLock?.lockedAt || null,
				violationCount: unit?.securityLock?.violationCount || 0,
				autoSubmittedAttempt: unit?.securityLock?.autoSubmittedAttempt || null,
				unlockHistory: unit?.securityLock?.unlockHistory || []
			};
		});
		res.json(result);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

router.post('/course/:courseId/unit/:unitId/unlock', logDetailedOperation('UNLOCK_UNIT'), async (req, res) => {
	try {
		const { courseId, unitId } = req.params;
		const { studentId } = req.body;
		if (!studentId) return res.status(400).json({ message: 'studentId is required' });
		const progress = await StudentProgress.findOne({ course: courseId, student: studentId });
		if (!progress) return res.status(404).json({ message: 'Progress not found' });
		const unit = progress.units.find(u => u.unitId.toString() === unitId);
		if (!unit) return res.status(404).json({ message: 'Unit progress not found' });
		unit.securityLock = unit.securityLock || {};
		// Append unlock history entry
		unit.securityLock.unlockHistory = unit.securityLock.unlockHistory || [];
		unit.securityLock.unlockHistory.push({
			unlockedBy: req.user?._id,
			unlockedAt: new Date(),
			note: req.body?.note || ''
		});
		// Unlock
		unit.securityLock.locked = false;
		unit.securityLock.reason = '';
		unit.securityLock.lockedAt = null;
	await progress.save();
	const last = unit.securityLock.unlockHistory[unit.securityLock.unlockHistory.length - 1];
	res.json({ message: 'Unit quiz unlocked for student', lastUnlock: last });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Global: List all unlock requests across all courses/units
// Includes: (1) Security-locked units, (2) Attempts exhausted (>= effective limit) and not passed
router.get('/locks', async (req, res) => {
	try {
		const items = [];

		// 1) Security-locked units from StudentProgress
		const lockedDocs = await StudentProgress
			.find({ 'units.securityLock.locked': true })
			.populate('student', 'name email regNo')
			.populate('course', 'name code')
			.populate('units.unitId', 'title name')
			.populate('units.securityLock.autoSubmittedAttempt', '_id percentage passed completedAt')
			.populate('units.securityLock.unlockHistory.unlockedBy', 'name email');

		for (const doc of lockedDocs) {
			for (const unit of doc.units || []) {
				if (unit?.securityLock?.locked) {
					items.push({
						type: 'securityLock',
						student: doc.student,
						course: doc.course,
						unit: unit.unitId ? { _id: unit.unitId._id || unit.unitId, title: unit.unitId.title || unit.unitId.name || 'Unit' } : null,
						lockedAt: unit.securityLock.lockedAt || null,
						reason: unit.securityLock.reason || 'Locked due to security violations',
						violationCount: unit.securityLock.violationCount || 0,
						autoSubmittedAttempt: unit.securityLock.autoSubmittedAttempt || null,
						unlockHistory: unit.securityLock.unlockHistory || [],
						attemptsTaken: undefined,
						attemptLimit: undefined,
						extraAttempts: unit.extraAttempts || 0
					});
				}
			}
		}

		// 2) Attempts exhausted: aggregate attempts per student-course-unit
		const QuizAttempt = require('../models/QuizAttempt');
		const Unit = require('../models/Unit');
		const agg = await QuizAttempt.aggregate([
			{ $match: { $or: [ { completedAt: { $ne: null } }, { isComplete: true } ] } },
			{ $group: { _id: { student: '$student', course: '$course', unit: '$unit' }, attemptsTaken: { $sum: 1 }, lastCompletedAt: { $max: '$completedAt' } } },
			{ $match: { attemptsTaken: { $gte: 3 } } }
		]);

		// Map to add details and filter out those who already passed
		for (const rec of agg) {
			const { student, course, unit } = rec._id;
			const progress = await StudentProgress
				.findOne({ student, course })
				.populate('student', 'name email regNo')
				.populate('course', 'name code');
			if (!progress) continue;
			const unitProg = progress.units.find(u => u.unitId.toString() === String(unit));
			if (!unitProg) continue;
			if (unitProg.unitQuizPassed) continue; // skip passed
			const extraAttempts = unitProg.extraAttempts || 0;
			const effectiveLimit = 3 + extraAttempts;
			if (rec.attemptsTaken >= effectiveLimit) {
				// Fetch unit title
				const unitDoc = await Unit.findById(unit).select('title name');
				items.push({
					type: 'attemptsExhausted',
					student: progress.student,
					course: progress.course,
					unit: unitDoc ? { _id: unitDoc._id, title: unitDoc.title || unitDoc.name || 'Unit' } : { _id: unit },
					lockedAt: rec.lastCompletedAt || null,
					reason: 'Attempt limit reached',
					violationCount: 0,
					autoSubmittedAttempt: null,
					attemptsTaken: rec.attemptsTaken,
					attemptLimit: effectiveLimit,
					extraAttempts
				});
			}
		}

		// Sort: security locks by lockedAt, then attempts exhausted by lockedAt
		items.sort((a, b) => new Date(b.lockedAt || 0) - new Date(a.lockedAt || 0));
		res.json(items);
	} catch (err) {
		console.error('Error building locks list:', err);
		res.status(500).json({ message: err.message });
	}
});

// Grant extra attempts for a specific student and unit
router.post('/course/:courseId/unit/:unitId/grant-attempts', logDetailedOperation('GRANT_QUIZ_ATTEMPTS'), async (req, res) => {
	try {
		const { courseId, unitId } = req.params;
		const { studentId, extraAttempts = 1 } = req.body;
		if (!studentId) return res.status(400).json({ message: 'studentId is required' });
		const add = Math.max(1, parseInt(extraAttempts, 10) || 1);
		const progress = await StudentProgress.findOne({ course: courseId, student: studentId });
		if (!progress) return res.status(404).json({ message: 'Progress not found' });
		const unit = progress.units.find(u => u.unitId.toString() === unitId);
		if (!unit) return res.status(404).json({ message: 'Unit progress not found' });
		if (!unit.unitQuizPassed) {
			unit.extraAttempts = (unit.extraAttempts || 0) + add;
			await progress.save();
			return res.json({ message: `Granted ${add} extra attempt(s).`, extraAttempts: unit.extraAttempts });
		} else {
			return res.status(400).json({ message: 'Quiz already passed for this unit' });
		}
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get user assignments (sections and courses)
router.get('/user-assignments/:userId', adminController.getUserAssignments);

// Multi-role management routes
router.post('/users/multi-role', adminController.createMultiRoleUser);
router.get('/users/:userId/roles', adminController.getUserRoles);
router.post('/users/:userId/switch-role', adminController.switchUserRole);
router.patch('/users/:userId/roles', adminController.updateUserRoles);

// Section management routes for admin group chat
router.get('/sections/all', adminController.getAllSections);
router.get('/sections/:sectionId/courses', adminController.getSectionCourses);

// Admin teacher-section-course assignment (bypasses HOD role requirement)
router.post('/assign-teacher-to-section-course', logDetailedOperation('ASSIGN_TEACHER_TO_COURSE'), adminController.adminAssignTeacherToSectionCourse);
router.post('/remove-teacher-from-section-course', logDetailedOperation('REMOVE_TEACHER_FROM_COURSE'), adminController.adminRemoveTeacherFromSectionCourse);

// Bulk uploads for departments, sections, schools, and assignments
router.post('/schools/bulk-upload', upload.single('file'), logDetailedOperation('BULK_UPLOAD_SCHOOLS'), adminController.bulkUploadSchools);
router.post('/department/bulk', upload.single('file'), logDetailedOperation('BULK_UPLOAD_DEPARTMENTS'), adminController.bulkUploadDepartments);
router.post('/section/bulk', upload.single('file'), logDetailedOperation('BULK_UPLOAD_SECTIONS'), adminController.bulkUploadSections);
router.post('/section/bulk-course-assignment', upload.single('file'), logDetailedOperation('ASSIGN_COURSES_TO_SECTION'), adminController.bulkAssignCoursesToSections);
router.post('/section/bulk-teacher-assignment', upload.single('file'), logDetailedOperation('BULK_ASSIGN_TEACHERS'), adminController.bulkAssignTeachersToSections);

module.exports = router;

