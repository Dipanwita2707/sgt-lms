
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const AuditLog = require('../models/AuditLog');

// Helper function to extract IP address
const getIpAddress = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'Unknown';
};

// Logout (optional: implement token blacklisting)
exports.logout = async (req, res) => {
  try {
    // Log logout action
    if (req.user && req.user._id) {
      await AuditLog.create({
        action: 'USER_LOGOUT',
        description: `User ${req.user.name} (${req.user.email}) logged out successfully`,
        actionType: 'logout',
        performedBy: req.user._id,
        performedByRole: req.user.role,
        performedByName: req.user.name,
        performedByEmail: req.user.email,
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: 'success',
        severity: 'info',
        category: 'authentication',
        details: {
          logoutTime: new Date(),
          sessionInfo: {
            userAgent: req.headers['user-agent'],
            ip: getIpAddress(req)
          }
        },
        timestamp: new Date()
      });
    }
    
    // If you implement token blacklisting, add the token to the blacklist here
    // For a simple implementation, just return success since the frontend will handle clearing localStorage
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: err.message });
  }
};
// Request password reset (send email with link)
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Received password reset request for email:', normalizedEmail);
    
    // Do a case-insensitive search to maximize chances of finding the user
    const user = await User.findOne({ email: normalizedEmail });
    
    console.log('User found:', user ? 'Yes' : 'No');
    if (!user) {
      // Try a more flexible search if exact match not found
      const similarEmailUser = await User.findOne({ 
        email: { $regex: new RegExp(normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } 
      });
      
      if (similarEmailUser) {
        console.log('Found user with similar email:', similarEmailUser.email);
        return res.status(404).json({ 
          message: 'User not found. Did you mean ' + similarEmailUser.email + '?',
          suggestedEmail: similarEmailUser.email
        });
      }
      
      return res.status(404).json({ message: 'User not found with this email address. Please check for typos or contact support.' });
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${token}`;

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    await transporter.sendMail({
      to: user.email,
      subject: 'Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #1976d2;">Password Reset Request</h2>
          <p>You requested a password reset for your account. Click the button below to reset your password. This link is valid for 5 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1976d2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>
        </div>
      `
    });
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Password strength validation helper
function isStrongPassword(password) {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
}

// Redirect to frontend reset password page
exports.redirectToResetPage = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Check if token is valid before redirecting
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      // If token is invalid, redirect to frontend with error parameter
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password-error?reason=invalid`);
    }
    
    // Redirect to frontend reset password page with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`);
  } catch (err) {
    console.error('Reset page redirect error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password-error?reason=error`);
  }
};

// Reset password (via link)
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    console.log('Received password reset token:', token);
    
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    console.log('User found with token:', user ? 'Yes' : 'No');
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    console.log('Password reset successful for user:', user.email);
    
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Signup (for admin only, initial setup)
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (role !== 'admin') return res.status(403).json({ message: 'Only admin signup allowed here' });
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Admin already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({ name, email, password: hashedPassword, role });
    await admin.save();
    res.status(201).json({ message: 'Admin created' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Login (all roles) - supports email, regNo (student UID), or teacherId (teacher UID)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email/UID and password are required' });
    }
    
    // Normalize the login identifier (trim whitespace)
    const loginIdentifier = email.trim();
    
    // Try to find user by email, regNo, or teacherId
    let user = null;
    
    // Check if it's an email (contains @)
    if (loginIdentifier.includes('@')) {
      // Login by email
      const normalizedEmail = loginIdentifier.toLowerCase();
      user = await User.findOne({ email: normalizedEmail })
        .populate({
          path: 'roleAssignments.school roleAssignments.schools',
          select: 'name code'
        })
        .populate({
          path: 'roleAssignments.departments',
          select: 'name code school'
        });
    } else {
      // Login by UID (regNo for students or teacherId for teachers)
      // Try both regNo and teacherId since we don't know the user type
      user = await User.findOne({
        $or: [
          { regNo: loginIdentifier },
          { teacherId: loginIdentifier }
        ]
      })
        .populate({
          path: 'roleAssignments.school roleAssignments.schools',
          select: 'name code'
        })
        .populate({
          path: 'roleAssignments.departments',
          select: 'name code school'
        });
    }
    
    if (!user) {
      // Log failed login attempt
      await AuditLog.create({
        action: 'FAILED_LOGIN',
        description: `Failed login attempt for ${loginIdentifier} - User not found`,
        actionType: 'login',
        performedByEmail: loginIdentifier,
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: 'failure',
        statusCode: 400,
        severity: 'medium',
        category: 'authentication',
        isSuspicious: true,
        details: {
          reason: 'User not found',
          attemptedEmail: loginIdentifier,
          loginMethod: loginIdentifier.includes('@') ? 'email' : 'uid'
        },
        timestamp: new Date()
      });
      
      // If not found and it was an email, try a more flexible search
      if (loginIdentifier.includes('@')) {
        const normalizedEmail = loginIdentifier.toLowerCase();
        const similarEmailUser = await User.findOne({ 
          email: { $regex: new RegExp(normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } 
        });
        
        if (similarEmailUser) {
          console.log('Found user with similar email during login:', similarEmailUser.email);
          // Don't suggest the email for security reasons, just use a generic message
          return res.status(400).json({ message: 'Invalid credentials. Please check your email address.' });
        }
      }
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Log failed login - wrong password
      await AuditLog.create({
        action: 'FAILED_LOGIN',
        description: `Failed login attempt for ${user.name} (${user.email}) - Invalid password`,
        actionType: 'login',
        performedBy: user._id,
        performedByRole: user.role,
        performedByName: user.name,
        performedByEmail: user.email,
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: 'failure',
        statusCode: 400,
        severity: 'medium',
        category: 'authentication',
        isSuspicious: true,
        details: {
          reason: 'Invalid password',
          attemptedEmail: loginIdentifier
        },
        timestamp: new Date()
      });
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
      // Log failed login - account deactivated
      await AuditLog.create({
        action: 'FAILED_LOGIN',
        description: `Failed login attempt for ${user.name} (${user.email}) - Account deactivated`,
        actionType: 'login',
        performedBy: user._id,
        performedByRole: user.role,
        performedByName: user.name,
        performedByEmail: user.email,
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: 'failure',
        statusCode: 403,
        severity: 'medium',
        category: 'authentication',
        details: {
          reason: 'Account deactivated',
          attemptedEmail: loginIdentifier
        },
        timestamp: new Date()
      });
      
      return res.status(403).json({ message: 'Account deactivated' });
    }
    
    // Ensure permissions exist in both formats (lowercase with underscores and title case with spaces)
    const normalizedPermissions = [];
    
    if (user.permissions && Array.isArray(user.permissions)) {
      // First add all original permissions
      normalizedPermissions.push(...user.permissions);
      
      // Then add normalized versions in both formats
      user.permissions.forEach(perm => {
        // Convert snake_case to Title Case
        if (perm.includes('_')) {
          const titleCasePerm = perm.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          if (!normalizedPermissions.includes(titleCasePerm)) {
            normalizedPermissions.push(titleCasePerm);
          }
        } 
        // Convert Title Case to snake_case
        else if (/[A-Z]/.test(perm)) {
          const snakeCasePerm = perm.toLowerCase().replace(/\s+/g, '_');
          
          if (!normalizedPermissions.includes(snakeCasePerm)) {
            normalizedPermissions.push(snakeCasePerm);
          }
        }
      });
    }
    
    console.log('Normalized permissions:', normalizedPermissions);
    
    const token = jwt.sign({ 
      _id: user._id,
      id: user._id, 
      name: user.name,
      email: user.email,
      role: user.primaryRole || user.role, // Use primaryRole as the main role
      roles: user.roles || [user.role], // Include all roles array
      primaryRole: user.primaryRole || user.role,
      school: user.school,
      department: user.department,
      departments: user.departments || [],
      // Role-specific assignments for enhanced multi-role system
      roleAssignments: user.roleAssignments || [],
      permissions: normalizedPermissions
    }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Log successful login
    await AuditLog.create({
      action: 'USER_LOGIN',
      description: `User ${user.name} (${user.email}) logged in successfully using ${loginIdentifier.includes('@') ? 'email' : 'UID'} authentication`,
      actionType: 'login',
      performedBy: user._id,
      performedByRole: user.role,
      performedByName: user.name,
      performedByEmail: user.email,
      ipAddress: getIpAddress(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      requestMethod: req.method,
      requestUrl: req.originalUrl,
      status: 'success',
      statusCode: 200,
      severity: 'info',
      category: 'authentication',
      details: {
        loginMethod: loginIdentifier.includes('@') ? 'email' : 'uid',
        loginIdentifier: loginIdentifier,
        userRole: user.role,
        userRoles: user.roles || [user.role],
        primaryRole: user.primaryRole || user.role,
        school: user.school,
        department: user.department,
        permissions: normalizedPermissions.length,
        browser: req.headers['user-agent'] ? (
          req.headers['user-agent'].includes('Chrome') ? 'Chrome' :
          req.headers['user-agent'].includes('Firefox') ? 'Firefox' :
          req.headers['user-agent'].includes('Safari') ? 'Safari' :
          req.headers['user-agent'].includes('Edge') ? 'Edge' : 'Other'
        ) : 'Unknown',
        os: req.headers['user-agent'] ? (
          req.headers['user-agent'].includes('Windows') ? 'Windows' :
          req.headers['user-agent'].includes('Mac') ? 'macOS' :
          req.headers['user-agent'].includes('Linux') ? 'Linux' :
          req.headers['user-agent'].includes('Android') ? 'Android' :
          req.headers['user-agent'].includes('iOS') ? 'iOS' : 'Other'
        ) : 'Unknown'
      },
      timestamp: new Date()
    });
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        roles: user.roles || [user.role],
        primaryRole: user.primaryRole || user.role,
        permissions: normalizedPermissions
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ message: err.message });
  }
};

// Get current authenticated user with multi-role support
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get full user data with populated references
    const user = await User.findById(req.user._id)
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate({
        path: 'assignedSections',
        select: 'name school department courses teacher teachers students',
        populate: [
          {
            path: 'courses',
            select: 'name title code courseCode'
          },
          {
            path: 'teacher',
            select: 'name email uid teacherId'
          },
          {
            path: 'teachers',
            select: 'name email uid teacherId'
          },
          {
            path: 'students',
            select: 'name email'
          },
          {
            path: 'school',
            select: 'name'
          },
          {
            path: 'department',
            select: 'name'
          }
        ]
      })
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Support both multi-role and legacy single-role systems
    const responseData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles || [user.role],
      primaryRole: user.primaryRole || user.role,
      permissions: user.permissions || [],
      school: user.school,
      department: user.department,
      uid: user.uid,
      regNo: user.regNo, // Legacy - DEPRECATED
      studentId: user.uid || user.regNo, // Use UID first, fallback to regNo
      teacherId: user.teacherId, // Legacy - DEPRECATED
      employeeId: user.uid || user.teacherId, // Use UID first, fallback to teacherId
      coursesAssigned: user.coursesAssigned,
      assignedSections: user.assignedSections, // Include populated sections
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.json(responseData);
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ message: err.message });
  }
};
