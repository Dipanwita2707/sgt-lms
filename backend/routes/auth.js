const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimit');
const { auth } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Apply rate limiting to all auth endpoints
router.post('/signup', authLimiter, authController.signup); // Only for initial admin setup
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/request-password-reset', authLimiter, authController.requestPasswordReset);
router.get('/reset-password/:token', authController.redirectToResetPage); // Redirect to frontend
router.post('/reset-password/:token', authLimiter, authController.resetPassword);

// Protected routes requiring authentication
router.get('/me', auth, authController.getCurrentUser);
router.get('/me/roles', auth, (req, res) => adminController.getUserRoles(req, res));
router.post('/me/switch-role', auth, (req, res) => adminController.switchUserRole(req, res));

module.exports = router;
