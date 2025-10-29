const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const { getHODAnnouncementHistory } = require('../controllers/hodAnnouncementHistoryController');

// All routes protected by HOD role
router.use(auth, authorizeRoles('hod'));

// Get HOD's announcement approval history (with filters)
router.get('/history', getHODAnnouncementHistory);

module.exports = router;
