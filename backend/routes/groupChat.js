const express = require('express');
const router = express.Router();
const GroupChat = require('../models/GroupChat');
const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const ChatReadReceipt = require('../models/ChatReadReceipt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/chat-files');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocs = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ];

  if (allowedImages.includes(file.mimetype) || allowedDocs.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user has access to the chat room
const checkChatAccess = async (req, res, next) => {
  try {
    const { courseId, sectionId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has access to this course/section
    const section = await Section.findById(sectionId).populate('courses students teachers');
    const course = await Course.findById(courseId).populate('coordinators');
    
    if (!section || !course) {
      return res.status(404).json({ message: 'Course or section not found' });
    }

    let hasAccess = false;

    // Admin, Dean, HOD, superadmin have access to all chats
    if (user.roles && ['admin', 'dean', 'hod', 'superadmin'].some(role => user.roles.includes(role))) {
      hasAccess = true;
    } 
    // Check if user is a student in this section
    else if (user.roles && user.roles.includes('student') && section.students.some(s => s._id.toString() === userId)) {
      hasAccess = true;
    }
    // Check if user is a teacher for this course/section
    else if (user.roles && user.roles.includes('teacher')) {
      // Check if teacher is directly assigned to the section
      if (section.teachers && section.teachers.some(t => t._id.toString() === userId)) {
        hasAccess = true;
      }
      // Check if teacher is assigned to legacy single teacher field
      else if (section.teacher && section.teacher.toString() === userId) {
        hasAccess = true;
      }
      // Check if teacher is a course coordinator
      else if (course.coordinators && course.coordinators.some(cc => cc._id ? cc._id.toString() === userId : cc.toString() === userId)) {
        hasAccess = true;
      }
      // Temporary permissive mode for teachers
      else {
        console.log(`⚠️ [REST-API] Allowing teacher access (permissive mode) for course ${courseId}, section ${sectionId}`);
        hasAccess = true;
      }
    }
    // Check if user is a course coordinator
    else if (user.roles && user.roles.includes('cc')) {
      const courseWithCoordinators = await Course.findById(courseId).populate('coordinators');
      if (courseWithCoordinators && courseWithCoordinators.coordinators.some(cc => cc._id.toString() === userId)) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this chat room' });
    }

    req.course = course;
    req.section = section;
    next();
  } catch (error) {
    console.error('Chat access check error:', error);
    res.status(500).json({ message: 'Server error during access check' });
  }
};

// Get messages for a specific course/section chat
router.get('/messages/:courseId/:sectionId', verifyToken, checkChatAccess, async (req, res) => {
  try {
    const { courseId, sectionId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const user = await User.findById(req.user.id);

    // Fetch messages (excluding deleted ones for regular users)
    let query = { courseId, sectionId };
    
    // Only admin, dean, and hod can see deleted messages
    if (!user.roles || (!user.roles.includes('admin') && !user.roles.includes('dean') && !user.roles.includes('hod'))) {
      query.isDeleted = { $ne: true };
    }

    const messages = await GroupChat.find(query)
      .populate('senderId', 'name regNo teacherId roles primaryRole')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Format messages for frontend
    const formattedMessages = messages.reverse().map(message => {
      const sender = message.senderId;
      let displayName = sender.name;
      let displayId = '';

      // Format display name based on role
      if (sender.roles && sender.roles.includes('admin')) {
        displayName = 'Admin';
        displayId = '';
      } else if (sender.roles && sender.roles.includes('dean')) {
        displayName = `Dean ${sender.name}`;
        displayId = '';
      } else if (sender.roles && sender.roles.includes('hod')) {
        displayName = `HOD ${sender.name}`;
        displayId = '';
      } else {
        if (sender.roles && sender.roles.includes('student') && sender.regNo) {
          displayId = sender.regNo;
        } else if (sender.roles && sender.roles.includes('teacher') && sender.teacherId) {
          displayId = sender.teacherId;
        }
      }

      return {
        _id: message._id,
        message: message.message,
        messageType: message.messageType || 'text', // Include messageType
        timestamp: message.timestamp,
        flagged: message.flagged,
        isDeleted: message.isDeleted,
        // Include file-related fields if they exist
        ...(message.fileUrl ? {
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          mimeType: message.mimeType
        } : {}),
        // Include reactions
        reactions: message.reactions || [],
        sender: {
          _id: sender._id,
          name: displayName,
          id: displayId,
          roles: sender.roles
        },
        canDelete: checkCanDelete(message, user),
        canShowDelete: checkCanShowDelete(user),
        isOwner: message.senderId._id.toString() === user._id.toString()
      };
    });

    res.json({
      success: true,
      messages: formattedMessages,
      course: req.course,
      section: req.section
    });

  } catch (error) {
    console.error('Error loading messages:', error);
    res.status(500).json({ message: 'Failed to load messages' });
  }
});

// Helper function to check if user can delete a message
function checkCanDelete(message, user) {
  if (!user) return false;
  
  // Admin, Dean, and HOD can delete any message
  if (user.roles && (
    user.roles.includes('admin') || 
    user.roles.includes('dean') || 
    user.roles.includes('hod')
  )) {
    return true;
  }
  
  // Users can delete their own messages within 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (message.senderId._id.toString() === user._id.toString() && 
      new Date(message.timestamp) > fiveMinutesAgo) {
    return true;
  }
  
  return false;
}

// Helper function to check if user can see delete button
function checkCanShowDelete(user) {
  if (!user) return false;
  
  // Admin, Dean, and HOD can always see delete button
  if (user.roles && (
    user.roles.includes('admin') || 
    user.roles.includes('dean') || 
    user.roles.includes('hod')
  )) {
    return true;
  }
  
  return false;
}

// Get chat room info
router.get('/room/:courseId/:sectionId', verifyToken, checkChatAccess, async (req, res) => {
  try {
    res.json({
      success: true,
      course: req.course,
      section: req.section
    });
  } catch (error) {
    console.error('Error getting chat room info:', error);
    res.status(500).json({ message: 'Failed to get chat room info' });
  }
});

// Get all available chat rooms for the current user
router.get('/rooms', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('roles');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let chatRooms = [];
    const userRoles = user.roles || [];

    // Admin, Dean, HOD, Superadmin can see all chat rooms
    if (userRoles.includes('admin') || userRoles.includes('dean') || userRoles.includes('hod') || userRoles.includes('superadmin')) {
      const sections = await Section.find({ isActive: true })
        .populate('courses')
        .populate('school', 'name')
        .populate('department', 'name')
        .lean();

      for (const section of sections) {
        if (section.courses && section.courses.length > 0) {
          for (const course of section.courses) {
            chatRooms.push({
              courseId: course._id,
              courseName: course.title,
              courseCode: course.code,
              sectionId: section._id,
              sectionName: section.name,
              schoolName: section.school?.name || 'Unknown School',
              departmentName: section.department?.name || 'Unknown Department',
              semester: section.semester,
              year: section.year
            });
          }
        }
      }
    }
    // Students see their section's courses
    else if (userRoles.includes('student')) {
      const sections = await Section.find({ students: userId, isActive: true })
        .populate('courses')
        .populate('school', 'name')
        .populate('department', 'name')
        .lean();

      for (const section of sections) {
        if (section.courses && section.courses.length > 0) {
          for (const course of section.courses) {
            chatRooms.push({
              courseId: course._id,
              courseName: course.title,
              courseCode: course.code,
              sectionId: section._id,
              sectionName: section.name,
              schoolName: section.school?.name || 'Unknown School',
              departmentName: section.department?.name || 'Unknown Department',
              semester: section.semester,
              year: section.year
            });
          }
        }
      }
    }
    // Teachers and CCs see their assigned sections/courses
    else if (userRoles.includes('teacher') || userRoles.includes('cc')) {
      // Find sections where user is a teacher
      const sections = await Section.find({
        $or: [
          { teachers: userId },
          { teacher: userId } // Legacy single teacher field
        ],
        isActive: true
      })
        .populate('courses')
        .populate('school', 'name')
        .populate('department', 'name')
        .lean();

      // Find courses where user is a coordinator
      const coordinatedCourses = await Course.find({ coordinators: userId }).lean();
      const coordinatedCourseIds = coordinatedCourses.map(c => c._id.toString());

      // Add sections where user is directly assigned
      for (const section of sections) {
        if (section.courses && section.courses.length > 0) {
          for (const course of section.courses) {
            chatRooms.push({
              courseId: course._id,
              courseName: course.title,
              courseCode: course.code,
              sectionId: section._id,
              sectionName: section.name,
              schoolName: section.school?.name || 'Unknown School',
              departmentName: section.department?.name || 'Unknown Department',
              semester: section.semester,
              year: section.year,
              isCoordinator: coordinatedCourseIds.includes(course._id.toString())
            });
          }
        }
      }

      // Add sections with coordinated courses (if not already added)
      if (coordinatedCourseIds.length > 0) {
        const coordinatedSections = await Section.find({
          courses: { $in: coordinatedCourseIds },
          isActive: true
        })
          .populate('courses')
          .populate('school', 'name')
          .populate('department', 'name')
          .lean();

        for (const section of coordinatedSections) {
          if (section.courses && section.courses.length > 0) {
            for (const course of section.courses) {
              if (coordinatedCourseIds.includes(course._id.toString())) {
                // Check if already added
                const exists = chatRooms.some(
                  room => room.courseId.toString() === course._id.toString() && 
                         room.sectionId.toString() === section._id.toString()
                );
                
                if (!exists) {
                  chatRooms.push({
                    courseId: course._id,
                    courseName: course.title,
                    courseCode: course.code,
                    sectionId: section._id,
                    sectionName: section.name,
                    schoolName: section.school?.name || 'Unknown School',
                    departmentName: section.department?.name || 'Unknown Department',
                    semester: section.semester,
                    year: section.year,
                    isCoordinator: true
                  });
                }
              }
            }
          }
        }
      }
    }

    // Remove duplicates and sort
    const uniqueRooms = chatRooms.filter((room, index, self) =>
      index === self.findIndex((r) => 
        r.courseId.toString() === room.courseId.toString() && 
        r.sectionId.toString() === room.sectionId.toString()
      )
    );

    // Sort by school, department, section, course
    uniqueRooms.sort((a, b) => {
      if (a.schoolName !== b.schoolName) return a.schoolName.localeCompare(b.schoolName);
      if (a.departmentName !== b.departmentName) return a.departmentName.localeCompare(b.departmentName);
      if (a.sectionName !== b.sectionName) return a.sectionName.localeCompare(b.sectionName);
      return a.courseCode.localeCompare(b.courseCode);
    });

    res.json({
      success: true,
      chatRooms: uniqueRooms,
      count: uniqueRooms.length
    });

  } catch (error) {
    console.error('Error getting chat rooms:', error);
    res.status(500).json({ message: 'Failed to get chat rooms', error: error.message });
  }
});

// File upload endpoint (Teachers, HODs, Deans only)
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, sectionId } = req.body;

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user has permission to upload files (teachers, HODs, deans, admins)
    const userRoles = user.roles || [];
    const canUpload = userRoles.some(role => ['teacher', 'hod', 'dean', 'admin'].includes(role));

    if (!canUpload) {
      // Delete the uploaded file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ 
        success: false, 
        message: 'Only teachers, HODs, and deans can upload files' 
      });
    }

    // Verify access to chat room
    const section = await Section.findById(sectionId).populate('courses students teachers');
    const course = await Course.findById(courseId).populate('coordinators');
    
    if (!section || !course) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: 'Course or section not found' });
    }

    // Verify chat access (same logic as checkChatAccess middleware)
    let hasAccess = false;
    if (userRoles.some(role => ['admin', 'dean', 'hod', 'superadmin'].includes(role))) {
      hasAccess = true;
    } else if (userRoles.includes('teacher')) {
      if (section.teachers && section.teachers.some(t => t._id.toString() === userId)) {
        hasAccess = true;
      } else if (section.teacher && section.teacher.toString() === userId) {
        hasAccess = true;
      } else if (course.coordinators && course.coordinators.some(cc => (cc._id ? cc._id.toString() : cc.toString()) === userId)) {
        hasAccess = true;
      } else {
        hasAccess = true; // Permissive mode for teachers
      }
    }

    if (!hasAccess) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ success: false, message: 'Access denied to this chat room' });
    }

    // File uploaded successfully
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Generate file URL (relative path for serving)
    const fileUrl = `/uploads/chat-files/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    console.log(`📎 [CHAT-UPLOAD] File uploaded by ${user.name} (${userRoles.join(', ')}): ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl,
      fileName,
      fileSize,
      mimeType
    });

  } catch (error) {
    console.error('❌ [CHAT-UPLOAD] Error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'File too large. Maximum size is 10MB.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: `Upload error: ${error.message}` 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload file' 
    });
  }
});

// Get unread counts for all chat rooms
router.get('/unread-counts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // First, get all chat rooms for this user
    const user = await User.findById(userId).populate('roles');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let chatRooms = [];
    const userRoles = user.roles || [];

    // Get chat rooms based on role (same logic as /rooms endpoint)
    if (userRoles.some(role => ['admin', 'dean', 'hod', 'superadmin'].includes(role))) {
      // Admin/Dean/HOD/Superadmin: all active section-course chats
      const sections = await Section.find({ isActive: true })
        .populate('courses')
        .lean();

      for (const section of sections) {
        if (section.courses && section.courses.length > 0) {
          for (const course of section.courses) {
            chatRooms.push({
              courseId: course._id,
              sectionId: section._id
            });
          }
        }
      }
    } else if (userRoles.includes('student')) {
      // Student: only their section's courses
      const sections = await Section.find({ 
        students: userId,
        isActive: true 
      })
        .populate('courses')
        .lean();

      for (const section of sections) {
        if (section.courses && section.courses.length > 0) {
          for (const course of section.courses) {
            chatRooms.push({
              courseId: course._id,
              sectionId: section._id
            });
          }
        }
      }
    } else if (userRoles.includes('teacher')) {
      // Teacher: sections they teach
      const sections = await Section.find({
        $or: [
          { teachers: userId },
          { teacher: userId }
        ],
        isActive: true
      })
        .populate('courses')
        .lean();

      for (const section of sections) {
        if (section.courses && section.courses.length > 0) {
          for (const course of section.courses) {
            chatRooms.push({
              courseId: course._id,
              sectionId: section._id
            });
          }
        }
      }

      // Add courses they coordinate
      const coordinatedCourses = await Course.find({
        coordinators: userId
      }).lean();

      const coordinatedCourseIds = coordinatedCourses.map(c => c._id.toString());

      if (coordinatedCourseIds.length > 0) {
        const coordinatedSections = await Section.find({
          courses: { $in: coordinatedCourseIds },
          isActive: true
        })
          .populate('courses')
          .lean();

        for (const section of coordinatedSections) {
          if (section.courses && section.courses.length > 0) {
            for (const course of section.courses) {
              if (coordinatedCourseIds.includes(course._id.toString())) {
                const exists = chatRooms.some(
                  room => room.courseId.toString() === course._id.toString() && 
                         room.sectionId.toString() === section._id.toString()
                );
                
                if (!exists) {
                  chatRooms.push({
                    courseId: course._id,
                    sectionId: section._id
                  });
                }
              }
            }
          }
        }
      }
    }

    // Get unread counts for all rooms
    const unreadCounts = await ChatReadReceipt.getAllUnreadCounts(userId, chatRooms);

    // Calculate total unread
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

    res.json({
      success: true,
      unreadCounts,
      totalUnread
    });

  } catch (error) {
    console.error('Error getting unread counts:', error);
    res.status(500).json({ message: 'Failed to get unread counts', error: error.message });
  }
});

// Get unread count for a specific chat
router.get('/unread-count/:courseId/:sectionId', verifyToken, checkChatAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, sectionId } = req.params;

    const unreadCount = await ChatReadReceipt.getUnreadCount(userId, courseId, sectionId);
    
    // Also get the read receipt to return lastReadMessageId
    const receipt = await ChatReadReceipt.findOne({ userId, courseId, sectionId });

    res.json({
      success: true,
      unreadCount,
      lastReadMessageId: receipt?.lastReadMessageId || null,
      courseId,
      sectionId
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Failed to get unread count', error: error.message });
  }
});

// Mark messages as read
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, sectionId, lastReadMessageId } = req.body;

    if (!courseId || !sectionId) {
      return res.status(400).json({ message: 'courseId and sectionId are required' });
    }

    // Update or create read receipt
    const receipt = await ChatReadReceipt.updateReadReceipt(
      userId, 
      courseId, 
      sectionId, 
      lastReadMessageId
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
      receipt
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read', error: error.message });
  }
});

module.exports = router;