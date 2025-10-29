// Allow teacher, HOD, or admin
exports.isTeacherOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'hod') {
    return next();
  }
  return res.status(403).json({ message: 'Teacher, HOD, or admin access required' });
};
// Allow teacher, CC, HOD, or admin (CC is a teacher responsibility, HOD needs access to manage quiz pools)
exports.isTeacherCcOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'hod') {
    return next();
  }
  return res.status(403).json({ message: 'Teacher, HOD, or admin access required' });
};
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authenticate token
exports.authenticateToken = async (req, res, next) => {
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

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

// Check if user is teacher
exports.isTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Teacher access required' });
  }
  
  next();
};

// Check if user is student
exports.isStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Student access required' });
  }
  
  next();
};

// Check if user is HOD
exports.isHOD = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'hod' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'HOD access required' });
  }
  
  next();
};
