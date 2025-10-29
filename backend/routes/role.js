const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { auth, authorizeRoles } = require('../middleware/auth');

// Allow admin users to manage roles and audit logs
router.post('/role', auth, authorizeRoles('admin'), roleController.createRole);
router.put('/role/:id', auth, authorizeRoles('admin'), roleController.editRole);
router.get('/roles', auth, authorizeRoles('admin'), roleController.listRoles);
router.post('/assign-role', auth, authorizeRoles('admin'), roleController.assignRole);
router.get('/audit-logs', auth, authorizeRoles('admin'), roleController.listAuditLogs);

module.exports = router;
