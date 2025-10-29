const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');

// Get announcements for the authenticated user (works for all roles)
router.get('/', auth, announcementController.getAnnouncements);

// Create a new announcement (role-based permissions)
router.post('/', auth, announcementController.createAnnouncement);

// Get targeting options based on user role
router.get('/targeting-options', auth, announcementController.getTargetingOptions);

// Moderate announcement (approve/reject) - HOD/Admin only
router.patch('/:id/moderate', auth, announcementController.moderateAnnouncement);

// Toggle teacher announcement permission - HOD/Admin only
router.patch('/teacher/:teacherId/permission', auth, announcementController.toggleTeacherPermission);

// Get pending announcements for HOD approval
router.get('/pending-approvals', auth, announcementController.getPendingApprovals);

// Approve or reject teacher announcement - HOD only
router.patch('/:id/approve', auth, announcementController.approveTeacherAnnouncement);

// Cross-school announcement approval - Dean only
router.patch('/:id/cross-school-approve', auth, announcementController.approveCrossSchoolAnnouncement);

// Get pending cross-school announcements for dean approval
router.get('/pending-cross-school', auth, announcementController.getPendingCrossSchoolRequests);

// Get HOD's approval history - HOD/Admin only (MUST be before /:id routes)
router.get('/my-approvals/history', auth, announcementController.getHODApprovalHistory);

// Get approval history for a specific announcement - HOD/Admin only
router.get('/:id/approval-history', auth, announcementController.getAnnouncementApprovalHistory);

// Get edit history for a specific announcement - Admin only
router.get('/:id/history', auth, announcementController.getAnnouncementHistory);

module.exports = router;
