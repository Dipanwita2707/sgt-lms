const Course = require('../models/Course');

// Middleware to check if user is currently a Course Coordinator
const requireCCRole = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admin and HOD have full access to CC functionality
    if (req.user.role === 'admin' || req.user.role === 'hod') {
      return next();
    }

    // For teachers, check if they are currently assigned as CC to any course
    const isCC = await Course.exists({ 
      coordinators: { $in: [req.user._id] },
      isActive: { $ne: false }  // Only check active courses
    });

    if (!isCC) {
      return res.status(403).json({ 
        message: 'Access denied: You are not assigned as a Course Coordinator for any course',
        code: 'NOT_CC'
      });
    }

    next();
  } catch (error) {
    console.error('Error in requireCCRole middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Middleware to check if user can coordinate a specific course
const requireCourseCoordination = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admin and HOD have full access
    if (req.user.role === 'admin' || req.user.role === 'hod') {
      return next();
    }

    const courseId = req.params.courseId || req.body.courseId;
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID required' });
    }

    // Check if user coordinates this specific course
    const coordinatesCourse = await Course.exists({ 
      _id: courseId,
      coordinators: { $in: [req.user._id] },
      isActive: { $ne: false }
    });

    if (!coordinatesCourse) {
      return res.status(403).json({ 
        message: 'Access denied: You are not the coordinator for this course',
        code: 'NOT_COURSE_CC'
      });
    }

    next();
  } catch (error) {
    console.error('Error in requireCourseCoordination middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  requireCCRole,
  requireCourseCoordination
};