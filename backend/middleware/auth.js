const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role-based access - Updated for multi-role support
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user has admin role in their roles array (admin has full access)
  const userRoles = req.user.roles || [req.user.role]; // Support both new and legacy format
  if (userRoles.includes('admin')) return next();
  
  // Check if user has any of the required roles
  if (!roles.some(role => userRoles.includes(role))) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Permission-based access - Updated for multi-role support
const authorizePermissions = (...permissions) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user has admin role (they have full access)
  const userRoles = req.user.roles || [req.user.role]; // Support both new and legacy format
  if (userRoles.includes('admin')) return next();
  
  if (!req.user.permissions || !permissions.some(p => req.user.permissions.includes(p))) {
    return res.status(403).json({ message: 'You do not have permission to manage teachers.' });
  }
  next();
};

// Role switching middleware - allows user to act as one of their assigned roles
const switchRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const requestedRole = req.headers['x-active-role'] || req.user.primaryRole;
  const userRoles = req.user.roles || [req.user.role]; // Support both new and legacy format
  
  if (requestedRole && !userRoles.includes(requestedRole)) {
    return res.status(403).json({ 
      message: 'You are not authorized to act as this role',
      availableRoles: userRoles 
    });
  }
  
  // Set the active role for this request
  req.activeRole = requestedRole || userRoles[0];
  next();
};

module.exports = { auth, authorizeRoles, authorizePermissions, switchRole };
