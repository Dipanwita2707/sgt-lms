const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Fetch notifications for current user (admin/teacher/student)
router.get('/', auth, notificationController.getNotifications);
// Unread count (lightweight for badge)
router.get('/unread-count', auth, notificationController.getUnreadCount);
// IMPORTANT: define the more specific route BEFORE the parameterized one to avoid matching issues
// Mark all notifications for current user as read
router.patch('/mark-all/read', auth, notificationController.markAllRead);
// Mark single notification as read
router.patch('/:id/read', auth, notificationController.markAsRead);

module.exports = router;
