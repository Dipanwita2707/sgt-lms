const express = require('express');
const router = express.Router();
const teacherRequestController = require('../controllers/teacherRequestController');
const { auth } = require('../middleware/auth');

// Teacher creates a request
router.post('/', auth, teacherRequestController.createRequest);

// Super admin views all requests
router.get('/', auth, teacherRequestController.getAllRequests);

// Super admin responds to a request
router.patch('/:requestId', auth, teacherRequestController.respondToRequest);

module.exports = router;
