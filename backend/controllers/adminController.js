// Bulk messaging: email or notification to students/teachers
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Course = require('../models/Course');
const School = require('../models/School');
const Department = require('../models/Department');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');

// POST /api/admin/bulk-message
exports.bulkMessage = async (req, res) => {
  try {
    const { target, type, subject, message } = req.body; // target: 'students'|'teachers', type: 'email'|'notification'
    let users = [];
    if (target === 'students') users = await User.find({ 
      $or: [
        { role: 'student', isActive: true },
        { roles: { $in: ['student'] }, isActive: true }
      ]
    });
    else if (target === 'teachers') users = await User.find({ 
      $or: [
        { role: 'teacher', isActive: true },
        { roles: { $in: ['teacher'] }, isActive: true }
      ]
    });
    else return res.status(400).json({ message: 'Invalid target' });

    if (type === 'email') {
      // Send email to all
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      const sendAll = users.map(u =>
        transporter.sendMail({
          to: u.email,
          subject: subject || 'Message from Admin',
          text: message
        })
      );
      await Promise.all(sendAll);
    } else if (type === 'notification') {
      // Create notification for all
      const notifs = users.map(u => ({ user: u._id, message, read: false }));
      await Notification.insertMany(notifs);
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }
    res.json({ message: 'Bulk message sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Import audit log service
const AuditLogService = require('../services/auditLogService');

// Recent audit logs for dashboard (BASIC - for backwards compatibility)
exports.getRecentAuditLogs = async (req, res) => {
  try {
    const logs = await require('../models/AuditLog')
      .find()
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// COMPREHENSIVE AUDIT LOG ENDPOINTS

// Get audit logs with advanced filtering
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      action,
      performedBy,
      targetUser,
      category,
      status,
      severity,
      isSuspicious,
      targetResource,
      startDate,
      endDate,
      ipAddress,
      page = 1,
      limit = 50
    } = req.query;
    
    const filters = {
      action,
      performedBy,
      targetUser,
      category,
      status,
      severity,
      isSuspicious: isSuspicious === 'true' ? true : isSuspicious === 'false' ? false : undefined,
      targetResource,
      startDate,
      endDate,
      ipAddress,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };
    
    // Remove undefined values
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
    
    const logs = await require('../models/AuditLog').advancedSearch(filters);
    
    // Get total count for pagination
    const AuditLog = require('../models/AuditLog');
    const query = {};
    if (action) query.action = { $regex: action, $options: 'i' };
    if (performedBy) query.performedBy = performedBy;
    if (targetUser) query.targetUser = targetUser;
    if (category) query.category = category;
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (isSuspicious !== undefined) query.isSuspicious = filters.isSuspicious;
    if (targetResource) query.targetResource = targetResource;
    if (ipAddress) query.ipAddress = ipAddress;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const totalCount = await AuditLog.countDocuments(query);
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get audit log statistics
exports.getAuditLogStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const statistics = await AuditLogService.getStatistics(filters);
    
    res.json(statistics);
    
  } catch (err) {
    console.error('Error fetching audit log statistics:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get suspicious activities
exports.getSuspiciousActivities = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find({ isSuspicious: true })
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalCount = await AuditLog.countDocuments({ isSuspicious: true });
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error('Error fetching suspicious activities:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get pending reviews
exports.getPendingReviews = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find({ requiresReview: true, reviewed: false })
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalCount = await AuditLog.countDocuments({ requiresReview: true, reviewed: false });
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error('Error fetching pending reviews:', err);
    res.status(500).json({ error: err.message });
  }
};

// Mark audit log as reviewed
exports.markAsReviewed = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user._id;
    
    const AuditLog = require('../models/AuditLog');
    const log = await AuditLog.findById(id);
    
    if (!log) {
      return res.status(404).json({ message: 'Audit log not found' });
    }
    
    await log.markAsReviewed(reviewerId);
    
    // Log this review action
    await AuditLogService.log({
      action: 'review_audit_log',
      performedBy: reviewerId,
      targetResource: 'audit_log',
      targetResourceId: id,
      req,
      details: {
        originalAction: log.action,
        originalPerformedBy: log.performedByName
      }
    });
    
    res.json({ message: 'Audit log marked as reviewed', log });
    
  } catch (err) {
    console.error('Error marking audit log as reviewed:', err);
    res.status(500).json({ error: err.message });
  }
};

// Export audit logs to CSV
exports.exportAuditLogs = async (req, res) => {
  try {
    const filters = req.query;
    
    const csv = await AuditLogService.exportToCSV(filters);
    
    // Log export action
    await AuditLogService.log({
      action: 'export_audit_logs',
      performedBy: req.user._id,
      req,
      details: { filters }
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString()}.csv"`);
    res.send(csv);
    
  } catch (err) {
    console.error('Error exporting audit logs:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get user activity history
exports.getUserActivityHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, page = 1 } = req.query;
    
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find({ performedBy: userId })
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalCount = await AuditLog.countDocuments({ performedBy: userId });
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error('Error fetching user activity history:', err);
    res.status(500).json({ error: err.message });
  }
};

// Advanced Audit Logs Endpoint with Comprehensive Filtering and Statistics
exports.getAdvancedAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      action,
      performedBy,
      severity,
      status,
      startDate,
      endDate,
      entity
    } = req.query;

    const AuditLog = require('../models/AuditLog');
    
    // Build query
    const query = {};
    
    // Search across multiple fields
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'performedBy.email': { $regex: search, $options: 'i' } },
        { 'performedBy.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by action
    if (action) {
      query.action = action;
    }
    
    // Filter by user email
    if (performedBy) {
      const User = require('../models/User');
      const user = await User.findOne({ email: { $regex: performedBy, $options: 'i' } });
      if (user) {
        query.performedBy = user._id;
      }
    }
    
    // Filter by severity
    if (severity) {
      query.severity = severity;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by entity type
    if (entity) {
      query.entityType = entity;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.$and = query.$and || [];
      if (startDate) {
        query.$and.push({ 
          $or: [
            { timestamp: { $gte: new Date(startDate) } },
            { createdAt: { $gte: new Date(startDate) } }
          ]
        });
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.$and.push({ 
          $or: [
            { timestamp: { $lte: endOfDay } },
            { createdAt: { $lte: endOfDay } }
          ]
        });
      }
    }
    
    // Get logs with pagination
    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Get total count
    const total = await AuditLog.countDocuments(query);
    
    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalLogs,
      todayLogs,
      criticalLogs,
      errorLogs,
      warningLogs,
      infoLogs
    ] = await Promise.all([
      AuditLog.countDocuments({}),
      AuditLog.countDocuments({ 
        $or: [
          { timestamp: { $gte: today } },
          { createdAt: { $gte: today } }
        ]
      }),
      AuditLog.countDocuments({ severity: 'critical' }),
      AuditLog.countDocuments({ severity: 'high' }),
      AuditLog.countDocuments({ severity: 'medium' }),
      AuditLog.countDocuments({ severity: 'low' })
    ]);
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      statistics: {
        total: totalLogs,
        today: todayLogs,
        critical: criticalLogs,
        high: errorLogs,
        medium: warningLogs,
        low: infoLogs
      }
    });
    
  } catch (err) {
    console.error('Error fetching advanced audit logs:', err);
    res.status(500).json({ error: err.message });
  }
};

const AuditLog = require('../models/AuditLog');
const AssignmentHistory = require('../models/AssignmentHistory');
// Admin changes own password
exports.changeOwnPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await User.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    const isMatch = await require('bcryptjs').compare(oldPassword, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Old password incorrect' });
    admin.password = await require('bcryptjs').hash(newPassword, 10);
    await admin.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Bulk assign courses via CSV (students or teachers)
exports.bulkAssignCourses = async (req, res) => {
  return res.status(400).json({ 
    message: 'Direct course assignment is no longer supported. Please assign teachers through sections in the HOD dashboard.' 
  });
};
// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('videos', 'title duration')
      .populate('units', 'title');
    res.json(courses);
  } catch (err) {
    console.error('Error getting all courses:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get courses by department
exports.getCoursesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const courses = await Course.find({ department: departmentId })
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('videos', 'title duration')
      .populate('units', 'title');
    res.json(courses);
  } catch (err) {
    console.error('Error getting courses by department:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ 
      $or: [
        { role: 'student' },
        { roles: 'student' }
      ]
    })
      .populate('school', 'name code')
      .populate('assignedSections', 'name code');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ 
      $or: [
        { role: 'teacher' },
        { roles: { $in: ['teacher'] } }
      ]
    })
    .populate('school', 'name code')
    .populate('department', 'name code');
    
    // For each teacher, get their section-course assignments
    
    const teachersWithSectionCourses = await Promise.all(teachers.map(async (teacher) => {
      try {
        // Get section-course assignments for this teacher
        const sectionCourseAssignments = await SectionCourseTeacher.find({ 
          teacher: teacher._id,
          isActive: true 
        })
        .populate('course', 'title courseCode description')
        .populate('section', 'name');
        
        // Extract unique courses from section assignments
        const sectionAssignedCourses = [];
        const seenCourseIds = new Set();
        
        // Extract unique sections
        const uniqueSections = [];
        const seenSectionIds = new Set();
        
        sectionCourseAssignments.forEach(assignment => {
          // Collect unique courses
          if (assignment.course && !seenCourseIds.has(assignment.course._id.toString())) {
            seenCourseIds.add(assignment.course._id.toString());
            sectionAssignedCourses.push({
              ...assignment.course.toObject(),
              section: assignment.section.name,
              assignmentType: 'section-based'
            });
          }
          
          // Collect unique sections
          if (assignment.section && !seenSectionIds.has(assignment.section._id.toString())) {
            seenSectionIds.add(assignment.section._id.toString());
            uniqueSections.push(assignment.section);
          }
        });
        
        // Only show section-based course assignments (no more direct assignments)
        return {
          ...teacher.toObject(),
          sections: uniqueSections, // Add sections array for display
          coursesAssigned: sectionAssignedCourses, // For frontend compatibility
          coursesFromSections: sectionAssignedCourses,
          sectionCourseAssignments: sectionCourseAssignments.map(assignment => ({
            section: assignment.section.name,
            course: assignment.course.title,
            courseCode: assignment.course.courseCode,
            assignedAt: assignment.assignedAt
          }))
        };
      } catch (error) {
        console.error(`Error fetching section courses for teacher ${teacher._id}:`, error);
        return {
          ...teacher.toObject(),
          sectionCourseAssignments: []
        };
      }
    }));
    
    res.json(teachersWithSectionCourses);
  } catch (err) {
    console.error('Error in getAllTeachers:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get all users (for user role management)
exports.getAllUsers = async (req, res) => {
  try {
    console.log('📋 getAllUsers - Request user:', req.user?._id, req.user?.email);
    
    // Fetch all users with different roles
    const users = await User.find({})
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('departments', 'name code')
      .select('-password')
      .sort({ createdAt: -1 });

    console.log('👥 Found users count:', users.length);
    
    // Debug: Log users with departments
    const usersWithDepts = users.filter(u => u.departments?.length > 0 || u.department);
    console.log('🏢 Users with departments:', usersWithDepts.map(u => ({
      id: u._id,
      email: u.email,
      departments: u.departments,
      department: u.department
    })));

    // Group users by their roles for better organization
    const usersByRole = users.reduce((acc, user) => {
      const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
      userRoles.forEach(role => {
        if (!acc[role]) acc[role] = [];
        // Avoid duplicates if user has multiple roles
        if (!acc[role].find(u => u._id.toString() === user._id.toString())) {
          acc[role].push({
            ...user.toObject(),
            currentRoles: userRoles,
            primaryRole: user.primaryRole || user.role
          });
        }
      });
      return acc;
    }, {});

    // Return both the full list and grouped data
    res.json({
      users: users.map(user => ({
        ...user.toObject(),
        currentRoles: user.roles && user.roles.length > 0 ? user.roles : [user.role],
        primaryRole: user.primaryRole || user.role
      })),
      usersByRole,
      totalCount: users.length,
      roleCounts: Object.keys(usersByRole).reduce((acc, role) => {
        acc[role] = usersByRole[role].length;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get teachers by department (for HOD)
exports.getTeachersByDepartment = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let departmentId;
    
    if (userRole === 'admin') {
      // Admin can specify department or get all teachers
      departmentId = req.query.departmentId;
      if (!departmentId) {
        return exports.getAllTeachers(req, res);
      }
    } else if (userRole === 'hod') {
      // HOD can only get teachers from their own department
      const hod = await User.findById(userId).populate('department');
      if (!hod.department) {
        return res.status(400).json({ message: 'HOD department not found' });
      }
      departmentId = hod.department._id;
    } else {
      return res.status(403).json({ message: 'Not authorized to view teachers' });
    }
    
    const teachers = await User.find({ 
      $or: [
        { roles: { $in: ['teacher'] } },
        { role: 'teacher' }
      ],
      department: departmentId 
    })
      .populate('department', 'name code')
      .populate('assignedSections', 'name')
      .select('name email teacherId canAnnounce department assignedSections');
    
    res.json({ teachers });
  } catch (err) {
    console.error('Error getting teachers by department:', err);
    res.status(500).json({ message: err.message });
  }
};

  // Super admin: Create announcement for teachers and/or students
  const Announcement = require('../models/Announcement');
  exports.createAnnouncement = async (req, res) => {
    try {
      console.log('Creating announcement with body:', req.body);
      const { message, recipients, title } = req.body; // recipients: ['teacher', 'student']
      if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: 'Message and recipients are required.' });
      }
      
      console.log('Creating announcement for recipients:', recipients);
      // Generate a title from the message (first 50 characters) or use provided title
      const announcementTitle = title || (message.length > 50 ? message.substring(0, 50) + '...' : message);
      
      console.log('Using title:', announcementTitle);
      console.log('Message:', message);
      console.log('Recipients:', recipients);
      
      // Convert old recipients format to new targetAudience format
      const targetAudience = {
        allUsers: false,
        isGlobal: false,
        targetRoles: recipients, // ['teacher', 'student', 'hod', 'dean']
        targetSchools: [],
        targetDepartments: [],
        targetSections: [],
        targetCourses: [],
        specificUsers: []
      };
      
      const announcement = new Announcement({
        sender: req.user._id,
        role: 'admin',
        title: announcementTitle,
        message,
        recipients, // Legacy field for backward compatibility
        targetAudience, // New field for proper filtering
        approvalStatus: 'approved' // Admin announcements are auto-approved
      });
      
      console.log('About to save announcement with data:', {
        sender: req.user._id,
        role: 'admin',
        title: announcementTitle,
        message,
        recipients,
        targetAudience
      });
      await announcement.save();
      console.log('Announcement saved successfully:', announcement._id);

      // Send notifications to recipients
      const NotificationController = require('./notificationController');
      let users = [];
      
      try {
        console.log('📢 Fetching recipients for notification...');
        
        if (recipients.includes('teacher')) {
          const teachers = await User.find({ 
            $or: [
              { role: 'teacher' },
              { roles: { $in: ['teacher'] } }
            ],
            isActive: true 
          });
          console.log(`👨‍🏫 Found ${teachers.length} teachers`);
          users = users.concat(teachers);
        }
        if (recipients.includes('student')) {
          const students = await User.find({ 
            $or: [
              { role: 'student' },
              { roles: { $in: ['student'] } }
            ],
            isActive: true 
          });
          console.log(`👨‍🎓 Found ${students.length} students`);
          users = users.concat(students);
        }
        if (recipients.includes('hod')) {
          const hods = await User.find({ 
            $or: [
              { role: 'hod' },
              { roles: { $in: ['hod'] } }
            ],
            isActive: true 
          });
          console.log(`👔 Found ${hods.length} HODs`);
          users = users.concat(hods);
        }
        if (recipients.includes('dean')) {
          const deans = await User.find({ 
            $or: [
              { role: 'dean' },
              { roles: { $in: ['dean'] } }
            ],
            isActive: true 
          });
          console.log(`🎩 Found ${deans.length} Deans`);
          users = users.concat(deans);
        }
        
        // Remove duplicates by user ID
        const uniqueUsers = users.filter((user, index, self) => 
          index === self.findIndex(u => u._id.toString() === user._id.toString())
        );
        
        console.log(`✅ Total unique recipients: ${uniqueUsers.length}`);
        console.log(`📤 Sending notifications to ${uniqueUsers.length} users...`);
        
        for (const user of uniqueUsers) {
          await NotificationController.createNotification({
            type: 'announcement',
            recipient: user._id,
            message: `New announcement: ${announcementTitle}`,
            data: { announcementId: announcement._id },
            announcement: announcement._id
          });
        }
        console.log('✅ All notifications sent successfully!');
      } catch (notificationError) {
        console.error('❌ Error sending notifications:', notificationError);
        // Don't fail the announcement creation if notifications fail
      }
      res.json({ 
        message: 'Announcement created successfully.',
        announcement: {
          _id: announcement._id,
          title: announcement.title,
          message: announcement.message,
          recipients: announcement.recipients
        }
      });
    } catch (err) {
      console.error('Error in createAnnouncement:', err);
      res.status(500).json({ message: err.message });
    }
  };

  // Update announcement
  exports.updateAnnouncement = async (req, res) => {
    try {
      const { id } = req.params;
      const { message, recipients } = req.body;
      
      if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: 'Message and recipients are required.' });
      }
      
      const announcement = await Announcement.findById(id);
      if (!announcement) {
        return res.status(404).json({ message: 'Announcement not found.' });
      }
      
      // Store previous values for edit history
      const previousMessage = announcement.message;
      const previousRecipients = [...announcement.recipients];
      
      // Update announcement
      announcement.message = message;
      announcement.recipients = recipients;
      announcement.isEdited = true;
      announcement.lastEditedBy = req.user._id;
      announcement.lastEditedAt = new Date();
      
      // Add to edit history
      announcement.editHistory = announcement.editHistory || [];
      announcement.editHistory.push({
        editedBy: req.user._id,
        editedAt: new Date(),
        previousMessage: previousMessage,
        previousRecipients: previousRecipients
      });
      
      await announcement.save();
      
      // Create audit log
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'edit_announcement',
        performedBy: req.user._id,
        details: { announcementId: id, message, recipients }
      });
      
      res.json({ message: 'Announcement updated successfully.' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  
  // Delete announcement
  exports.deleteAnnouncement = async (req, res) => {
    try {
      const { id } = req.params;
      
      const announcement = await Announcement.findById(id);
      if (!announcement) {
        return res.status(404).json({ message: 'Announcement not found.' });
      }
      
      await Announcement.findByIdAndDelete(id);
      
      // Create audit log
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'delete_announcement',
        performedBy: req.user._id,
        details: { announcementId: id }
      });
      
      res.json({ message: 'Announcement deleted successfully.' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Admin: Toggle teacher announcement permission
  exports.toggleTeacherAnnounce = async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { canAnnounce } = req.body;
      if (typeof canAnnounce !== 'boolean') {
        return res.status(400).json({ message: 'canAnnounce must be boolean.' });
      }
      const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found.' });
      }
      teacher.canAnnounce = canAnnounce;
      await teacher.save();
      res.json({ message: `Teacher announcement permission updated to ${canAnnounce}.` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

// Search teachers for dropdown selection
exports.searchTeachers = async (req, res) => {
  try {
    const query = req.query.q || '';
    
    // Search by name, email or teacherId
    const teachers = await User.find({
      role: 'teacher',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { teacherId: { $regex: query, $options: 'i' } }
      ]
    }).select('_id name email teacherId').limit(10);
    
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const Video = require('../models/Video');

// Helper: resolve an array of course identifiers (ObjectId strings or courseCode strings)
// to an array of valid Course ObjectIds. Returns { ids, notFound }
async function resolveCourseIdentifiers(identifiers) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) return { ids: [], notFound: [] };
  const ids = [];
  const notFound = [];
  for (const raw of identifiers) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    // If already a valid ObjectId, use directly
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      ids.push(trimmed);
      continue;
    }
    // Otherwise treat as courseCode
    const course = await Course.findOne({ courseCode: trimmed });
    if (course) ids.push(course._id);
    else notFound.push(trimmed);
  }
  // De-duplicate
  const unique = [...new Set(ids.map(id => id.toString()))];
  return { ids: unique, notFound };
}

// Add a teacher manually
exports.addTeacher = async (req, res) => {
  try {
    const { name, email, password, permissions, school, department, sectionsAssigned, roles } = req.body;
    
    // Validate required fields (department is now optional)
    if (!name || !email || !password || !school) {
      return res.status(400).json({ message: 'Name, email, password, and school are required' });
    }
    
    // Validate email format
    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if teacher with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    
    // Validate school exists
    const schoolExists = await School.findById(school);
    if (!schoolExists) {
      return res.status(400).json({ message: 'Invalid school selected' });
    }
    
    // Validate department if provided
    let departmentId = null;
    if (department) {
      const departmentExists = await Department.findById(department);
      if (!departmentExists) {
        return res.status(400).json({ message: 'Invalid department selected' });
      }
      
      // Verify department belongs to the selected school
      if (departmentExists.school.toString() !== school) {
        return res.status(400).json({ message: 'Department does not belong to the selected school' });
      }
      departmentId = department;
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate UID for teacher (staff)
    const { generateStaffUID } = require('../utils/uidGenerator');
    const uid = await generateStaffUID();
    
    // Handle multi-role assignment (default to teacher if no roles provided)
    let userRoles = ['teacher'];
    let primaryRole = 'teacher';
    
    if (roles && Array.isArray(roles) && roles.length > 0) {
      userRoles = [...new Set(roles)]; // Remove duplicates
      primaryRole = roles[0];
    }
    
    const teacher = new User({ 
      name, 
      email: normalizedEmail, 
      password: hashedPassword, 
      uid: uid,
      role: 'teacher', // Keep for backward compatibility
      roles: userRoles,
      primaryRole: primaryRole,
      permissions,
      school,
      department: departmentId,
      teacherId: null // Will be auto-generated in the pre-save hook (DEPRECATED - use uid instead)
    });
    
    const savedTeacher = await teacher.save();
    
    // Assign teacher to sections if provided
    if (sectionsAssigned && sectionsAssigned.length > 0) {
      try {
        const Section = require('../models/Section');
        for (const sectionId of sectionsAssigned) {
          const section = await Section.findById(sectionId);
          if (section && !section.teacher) {
            section.teacher = savedTeacher._id;
            await section.save();
          } else if (section && section.teacher) {
            console.warn(`Section ${sectionId} already has a teacher assigned`);
          }
        }
      } catch (sectionError) {
        console.error('Error assigning teacher to sections:', sectionError);
        // Don't fail teacher creation if section assignment fails
      }
    }
    
    await AuditLog.create({ 
      action: 'add_teacher', 
      performedBy: req.user._id, 
      targetUser: savedTeacher._id, 
      details: { name, email: normalizedEmail, school, department: departmentId } 
    });
    
    // Populate school and department info for response
    await savedTeacher.populate('school department');
    
    res.status(201).json(savedTeacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Super Admin: Add admin
exports.addAdmin = async (req, res) => {
  try {
    const { name, email, password, permissions, roles } = req.body;
    
    // Validate email format
    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if admin with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Handle multi-role assignment (default to admin if no roles provided)
    let userRoles = ['admin'];
    let primaryRole = 'admin';
    
    if (roles && Array.isArray(roles) && roles.length > 0) {
      userRoles = [...new Set(roles)]; // Remove duplicates
      primaryRole = roles[0];
    }
    
    const admin = new User({ 
      name, 
      email: normalizedEmail, 
      password: hashedPassword, 
      role: 'admin', // Keep for backward compatibility
      roles: userRoles,
      primaryRole: primaryRole,
      permissions 
    });
    
    await admin.save();
    await AuditLog.create({ 
      action: 'add_admin', 
      performedBy: req.user._id, 
      targetUser: admin._id, 
      details: { name, email: normalizedEmail } 
    });
    
    res.status(201).json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Multi-role user creation - unified function for creating users with multiple roles
exports.createMultiRoleUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      roles, 
      primaryRole,
      permissions, 
      school, 
      department, 
      section,
 
      sectionsAssigned 
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ 
        message: 'Name, email, password, and roles array are required' 
      });
    }
    
    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'A user with this email already exists' 
      });
    }
    
    // Validate roles
    const validRoles = ['admin', 'dean', 'hod', 'teacher', 'student'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ 
        message: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}` 
      });
    }
    
    // Remove duplicates from roles
    const uniqueRoles = [...new Set(roles)];
    
    // Determine primary role
    const userPrimaryRole = primaryRole && uniqueRoles.includes(primaryRole) 
      ? primaryRole 
      : uniqueRoles[0];
    
    // Validate school and department if provided
    let schoolId = null, departmentId = null, sectionId = null;
    
    if (school) {
      const schoolExists = await School.findById(school);
      if (!schoolExists) {
        return res.status(400).json({ message: 'Invalid school selected' });
      }
      schoolId = school;
    }
    
    if (department) {
      const departmentExists = await Department.findById(department);
      if (!departmentExists) {
        return res.status(400).json({ message: 'Invalid department selected' });
      }
      
      // Verify department belongs to the selected school if school is provided
      if (schoolId && departmentExists.school.toString() !== schoolId) {
        return res.status(400).json({ 
          message: 'Department does not belong to the selected school' 
        });
      }
      departmentId = department;
    }
    
    if (section) {
      const Section = require('../models/Section');
      const sectionExists = await Section.findById(section);
      if (!sectionExists) {
        return res.status(400).json({ message: 'Invalid section selected' });
      }
      sectionId = section;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate appropriate ID based on primary role
    let userId = null;
    if (userPrimaryRole === 'student') {
      // Auto-generate registration number for students
      const highestStudent = await User.findOne(
        { regNo: { $regex: /^S\d{6}$/ } },
        { regNo: 1 },
        { sort: { regNo: -1 } }
      );
      
      let nextNumber = 1;
      if (highestStudent && highestStudent.regNo) {
        const currentNumber = parseInt(highestStudent.regNo.substring(1), 10);
        nextNumber = currentNumber + 1;
      }
      
      userId = 'S' + nextNumber.toString().padStart(6, '0');
    }
    
    // Create user with multi-role support
    const userData = {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: userPrimaryRole, // Keep for backward compatibility
      roles: uniqueRoles,
      primaryRole: userPrimaryRole,
      permissions: permissions || [],
      school: schoolId,
      department: departmentId
    };
    
    // Add role-specific fields
    if (userPrimaryRole === 'student') {
      userData.regNo = userId;
    } else if (userPrimaryRole === 'teacher') {
      userData.teacherId = null; // Will be auto-generated
    }
    
    const user = new User(userData);
    const savedUser = await user.save();
    
    // Handle section assignment for students
    if (sectionId && uniqueRoles.includes('student')) {
      try {
        const Section = require('../models/Section');
        const sectionDoc = await Section.findById(sectionId);
        if (sectionDoc) {
          // Add student to section's students array if not already there
          if (!sectionDoc.students.includes(savedUser._id)) {
            sectionDoc.students.push(savedUser._id);
            await sectionDoc.save();
          }
          
          // Also add section to student's assignedSections array
          await User.findByIdAndUpdate(
            savedUser._id,
            { $addToSet: { assignedSections: sectionId } },
            { new: true }
          );
          
          console.log(`✅ Student ${savedUser.name} successfully assigned to section ${sectionDoc.name}`);
        }
      } catch (sectionError) {
        console.error('Error assigning user to section:', sectionError);
      }
    }
    
    // Handle section assignment for teachers
    if (sectionsAssigned && uniqueRoles.includes('teacher')) {
      try {
        const Section = require('../models/Section');
        for (const sectionId of sectionsAssigned) {
          const section = await Section.findById(sectionId);
          if (section && !section.teacher) {
            section.teacher = savedUser._id;
            await section.save();
          }
        }
      } catch (sectionError) {
        console.error('Error assigning teacher to sections:', sectionError);
      }
    }
    
    // Create audit log
    await AuditLog.create({
      action: 'create_multi_role_user',
      performedBy: req.user._id,
      targetUser: savedUser._id,
      details: { 
        name, 
        email: normalizedEmail, 
        roles: uniqueRoles,
        primaryRole: userPrimaryRole,
        school: schoolId,
        department: departmentId
      }
    });
    
    // Populate references for response
    await savedUser.populate('school department');
    
    res.status(201).json({
      _id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      roles: savedUser.roles,
      primaryRole: savedUser.primaryRole,
      school: savedUser.school,
      department: savedUser.department,
      regNo: savedUser.regNo,
      teacherId: savedUser.teacherId,
      assignedSections: savedUser.assignedSections
    });
  } catch (err) {
    console.error('Error creating multi-role user:', err);
    res.status(400).json({ message: err.message });
  }
};

// Get user's available roles and current active role
exports.getUserRoles = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const user = await User.findById(userId).select('roles primaryRole role name email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Support both new multi-role and legacy single-role systems
    const availableRoles = user.roles || [user.role];
    const currentRole = user.primaryRole || user.role;
    
    res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      availableRoles,
      currentRole,
      primaryRole: user.primaryRole
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Switch user's active role (for multi-role users)
exports.switchUserRole = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const { newRole } = req.body;
    
    if (!newRole) {
      return res.status(400).json({ message: 'New role is required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has the requested role
    const userRoles = user.roles || [user.role];
    if (!userRoles.includes(newRole)) {
      return res.status(403).json({ 
        message: 'User does not have permission to switch to this role',
        availableRoles: userRoles 
      });
    }
    
    // Update the primary role
    user.primaryRole = newRole;
    
    // For backward compatibility, also update the legacy role field
    user.role = newRole;
    
    await user.save();
    
    // Create audit log
    await AuditLog.create({
      action: 'switch_role',
      performedBy: req.user._id,
      targetUser: userId,
      details: { 
        fromRole: user.role,
        toRole: newRole,
        availableRoles: userRoles
      }
    });
    
    res.json({
      message: 'Role switched successfully',
      newRole,
      availableRoles: userRoles
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add or remove roles from a user (admin only)
exports.updateUserRoles = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles, primaryRole, action, school, department, departments } = req.body;
    
    // If no action is specified, default to 'set' for backward compatibility
    const updateAction = action || 'set';
    
    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ 
        message: 'Roles array is required' 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const validRoles = ['admin', 'dean', 'hod', 'teacher', 'student'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ 
        message: `Invalid roles: ${invalidRoles.join(', ')}` 
      });
    }
    
    // Validate hierarchical requirements
    if (roles.includes('dean') && !school && !user.school) {
      return res.status(400).json({ 
        message: 'Dean role requires a school assignment' 
      });
    }
    
    // HOD role no longer requires a department assignment - can manage multiple or none
    
    let currentRoles = user.roles || [user.role];
    let newRoles = [];
    
    switch (updateAction) {
      case 'add':
        newRoles = [...new Set([...currentRoles, ...roles])];
        break;
      case 'remove':
        newRoles = currentRoles.filter(role => !roles.includes(role));
        if (newRoles.length === 0) {
          return res.status(400).json({ 
            message: 'Cannot remove all roles from user' 
          });
        }
        break;
      case 'set':
        newRoles = [...new Set(roles)];
        break;
      default:
        return res.status(400).json({ 
          message: 'Invalid action. Use: add, remove, or set' 
        });
    }
    
    // Update user roles
    user.roles = newRoles;
    
    // Update primary role with hierarchy logic
    if (primaryRole && newRoles.includes(primaryRole)) {
      user.primaryRole = primaryRole;
      user.role = primaryRole; // Backward compatibility
    } else if (!newRoles.includes(user.primaryRole)) {
      // Set primary role based on hierarchy: admin > dean > hod > teacher > student
      const roleHierarchy = ['admin', 'dean', 'hod', 'teacher', 'student'];
      user.primaryRole = roleHierarchy.find(role => newRoles.includes(role)) || newRoles[0];
      user.role = user.primaryRole; // Backward compatibility
    }
    
    // Update hierarchical assignments
    if (school) {
      user.school = school;
    }
    
    // Handle both single department (legacy) and multiple departments (new)
    if (departments && Array.isArray(departments)) {
      user.departments = departments;
      // Keep backward compatibility with single department field
      if (departments.length > 0) {
        user.department = departments[0];
      }
    } else if (department) {
      user.department = department;
      user.departments = [department];
    }
    
    // Clear school/department if roles no longer require them
    if (!newRoles.includes('dean') && !newRoles.includes('hod') && !newRoles.includes('teacher')) {
      user.school = undefined;
      user.department = undefined;
      user.departments = [];
    } else if (!newRoles.includes('hod') && !newRoles.includes('teacher')) {
      user.department = undefined;
      user.departments = [];
    }
    
    await user.save();
    
    // Create audit log
    await AuditLog.create({
      action: 'update_user_roles',
      performedBy: req.user._id,
      targetUser: userId,
      details: { 
        action,
        previousRoles: currentRoles,
        newRoles,
        primaryRole: user.primaryRole
      }
    });
    
    res.json({
      message: 'User roles updated successfully',
      userId: user._id,
      name: user.name,
      roles: user.roles,
      primaryRole: user.primaryRole
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Bulk upload teachers via CSV with validation and error reporting
exports.bulkUploadTeachers = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const results = [];
  const errors = [];
  const seenEmails = new Set();
  
  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase() // Normalize headers
    }))
    .on('data', (data) => {
      // Normalize the data object to ensure keys are lowercase
      const normalizedData = {};
      Object.keys(data).forEach(key => {
        normalizedData[key.toLowerCase().trim()] = data[key];
      });
      results.push(normalizedData);
    })
    .on('end', async () => {
      try {
        // Validate all rows first
        console.log(`Processing ${results.length} rows from CSV`);
        
        // Check for basic required fields in the CSV
        if (results.length > 0) {
          const firstRow = results[0];
          console.log('First row keys:', Object.keys(firstRow));
          console.log('First row data:', firstRow);
          
          const requiredFields = ['name', 'email', 'password', 'school'];
          const missingHeaders = requiredFields.filter(field => 
            !Object.keys(firstRow).some(key => key.toLowerCase() === field)
          );
          
          if (missingHeaders.length > 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
              message: `CSV is missing required headers: ${missingHeaders.join(', ')}. Please use the template.` 
            });
          }
        }
        
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 2; // header is row 1
          
          if (!row.name || row.name.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: name' });
          }
          
          if (!row.email || row.email.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: email' });
          } else {
            // Normalize email for comparison
            const normalizedEmail = row.email.trim().toLowerCase();
            
            if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
              errors.push({ row: rowNum, message: 'Invalid email format' });
            }
            
            if (seenEmails.has(normalizedEmail)) {
              errors.push({ row: rowNum, message: 'Duplicate email in file' });
            }
            seenEmails.add(normalizedEmail);
          }
          
          if (!row.password || row.password.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: password' });
          }
          
          if (!row.school || row.school.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: school' });
          }
        }
        
        // Check for existing emails in DB
        const emails = results
          .filter(r => r.email && r.email.trim() !== '')
          .map(r => r.email.trim().toLowerCase());
        
        if (emails.length > 0) {
          const existing = await User.find({ 
            email: { $in: emails } 
          }, 'email');
          
          for (const e of existing) {
            const normalizedExistingEmail = e.email.toLowerCase();
            const idx = results.findIndex(r => 
              r.email && r.email.trim().toLowerCase() === normalizedExistingEmail
            );
            
            if (idx !== -1) {
              errors.push({ 
                row: idx + 2, 
                message: `Email ${results[idx].email} already exists in system` 
              });
            }
          }
        }
        
        if (errors.length > 0) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'Validation failed', errors });
        }
        
        // If valid, insert all
        const School = require('../models/School');
        const Department = require('../models/Department');
        const insertErrors = [];
        let successCount = 0;
        
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 2; // header is row 1
          
          try {
            const name = row.name ? row.name.trim() : '';
            const email = row.email ? row.email.trim().toLowerCase() : '';
            const password = row.password ? row.password.trim() : '';
            const schoolRaw = row.school ? row.school.trim() : '';
            const departmentRaw = row.department ? row.department.trim() : '';
            
            console.log(`Row ${rowNum}: Looking for school: "${schoolRaw}"`);
            
            // Find school by name, code, or ObjectId
            const school = await School.findOne({
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(schoolRaw) ? schoolRaw : null },
                { code: schoolRaw },
                { name: { $regex: new RegExp('^' + schoolRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
              ]
            });
            
            console.log(`Row ${rowNum}: School found:`, school ? school.name : 'NOT FOUND');
            
            if (!school) {
              insertErrors.push({ 
                row: rowNum, 
                message: `School '${schoolRaw}' not found` 
              });
              continue;
            }
            
            // Find department if provided
            let departmentId = null;
            if (departmentRaw) {
              const department = await Department.findOne({
                $or: [
                  { _id: mongoose.Types.ObjectId.isValid(departmentRaw) ? departmentRaw : null },
                  { code: departmentRaw },
                  { name: { $regex: new RegExp('^' + departmentRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
                ],
                school: school._id
              });
              
              if (!department) {
                insertErrors.push({ 
                  row: rowNum, 
                  message: `Department '${departmentRaw}' not found in ${school.name}` 
                });
                continue;
              }
              departmentId = department._id;
            }
            
            // Generate UID for teacher (staff)
            const { generateStaffUID } = require('../utils/uidGenerator');
            const uid = await generateStaffUID();
            
            // Check if teacherId is provided in CSV, otherwise let it auto-generate
            const teacherIdRaw = row.teacherid || row['teacher id'] || row['teacher_id'] || '';
            
            const hashedPassword = await bcrypt.hash(password, 10);
            const teacherData = { 
              name, 
              email, 
              password: hashedPassword, 
              uid: uid,
              role: 'teacher',
              roles: ['teacher'],
              primaryRole: 'teacher',
              school: school._id,
              department: departmentId
            };
            
            // Only add teacherId if provided in CSV, otherwise let pre-save hook generate it
            if (teacherIdRaw && teacherIdRaw.trim()) {
              teacherData.teacherId = teacherIdRaw.trim();
            }
            // Note: If teacherId is not provided, the pre-save hook will auto-generate it
            
            const teacher = await User.create(teacherData);
            
            await AuditLog.create({ 
              action: 'bulk_add_teacher', 
              performedBy: req.user._id, 
              targetUser: teacher._id, 
              details: { name, email, school: school.name, department: departmentId } 
            });
            
            successCount++;
            
          } catch (err) {
            console.error(`Error creating teacher at row ${rowNum}:`, err.message);
            insertErrors.push({ 
              row: rowNum, 
              message: err.message || 'Failed to create teacher' 
            });
          }
        }
        
        fs.unlinkSync(req.file.path);
        
        // Return success and error counts
        const totalErrors = [...errors, ...insertErrors];
        if (totalErrors.length > 0) {
          return res.status(207).json({ 
            message: `${successCount} teachers uploaded successfully, ${totalErrors.length} failed`,
            success: successCount,
            failed: totalErrors.length,
            errors: totalErrors
          });
        }
        
        res.json({ 
          message: `${results.length} teachers uploaded successfully`,
          success: results.length,
          failed: 0
        });
      } catch (err) {
        console.error('Error in bulkUploadTeachers:', err);
        res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

// Bulk Upload HODs with CSV
exports.bulkUploadHODs = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a CSV file' });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];

  fs.createReadStream(filePath)
    .pipe(csvParser({
      mapHeaders: ({ header }) => header.trim().toLowerCase()
    }))
    .on('data', (row) => {
      results.push(row);
    })
    .on('end', async () => {
      try {
        const { generateStaffUID } = require('../utils/uidGenerator');
        const created = [];
        
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 2; // CSV row number (accounting for header)
          
          try {
            // Extract and validate required fields
            const name = row.name?.trim();
            const email = row.email?.trim();
            const password = row.password?.trim();
            const schoolName = row.school?.trim();
            const departmentName = row.department?.trim();
            const teacherIdRaw = row.teacherId?.trim();
            
            if (!name || !email || !password || !schoolName || !departmentName) {
              errors.push({ row: rowNum, message: 'Missing required fields (name, email, password, school, department)' });
              continue;
            }
            
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
              errors.push({ row: rowNum, message: `Email ${email} already exists` });
              continue;
            }
            
            // Find school
            const school = await School.findOne({ name: new RegExp(`^${schoolName}$`, 'i') });
            if (!school) {
              errors.push({ row: rowNum, message: `School "${schoolName}" not found` });
              continue;
            }
            
            // Find department
            const department = await Department.findOne({ 
              name: new RegExp(`^${departmentName}$`, 'i'),
              school: school._id 
            });
            if (!department) {
              errors.push({ row: rowNum, message: `Department "${departmentName}" not found in school "${schoolName}"` });
              continue;
            }
            
            // Check if department already has an HOD
            if (department.hod) {
              const existingHOD = await User.findById(department.hod);
              if (existingHOD) {
                errors.push({ row: rowNum, message: `Department "${departmentName}" already has HOD: ${existingHOD.name}` });
                continue;
              }
            }
            
            // Generate UID
            const uid = await generateStaffUID();
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Prepare HOD data
            const hodData = {
              name,
              email,
              password: hashedPassword,
              uid,
              role: 'hod',
              roles: ['hod'],
              primaryRole: 'hod',
              school: school._id,
              department: department._id,
              isActive: true,
              emailVerified: true
            };
            
            // Add teacherId if provided in CSV
            if (teacherIdRaw && teacherIdRaw.length > 0) {
              // Validate teacherId format (5 digits)
              if (!/^\d{5}$/.test(teacherIdRaw)) {
                errors.push({ row: rowNum, message: `Invalid teacherId format for ${email}. Expected 5 digits (e.g., 00001)` });
                continue;
              }
              
              // Check if teacherId already exists
              const existingTeacherId = await User.findOne({ teacherId: teacherIdRaw });
              if (existingTeacherId) {
                errors.push({ row: rowNum, message: `Teacher ID ${teacherIdRaw} already exists` });
                continue;
              }
              
              hodData.teacherId = teacherIdRaw;
            }
            // If not provided, pre-save hook will auto-generate
            
            // Create HOD
            const hod = await User.create(hodData);
            
            // Update department with HOD reference
            await Department.findByIdAndUpdate(department._id, { hod: hod._id });
            
            created.push({
              name: hod.name,
              email: hod.email,
              uid: hod.uid,
              teacherId: hod.teacherId,
              department: department.name,
              school: school.name
            });
            
          } catch (rowErr) {
            errors.push({ row: rowNum, message: rowErr.message });
          }
        }
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        if (errors.length > 0) {
          return res.status(400).json({ 
            message: `Uploaded ${created.length} HODs with ${errors.length} errors`,
            success: created.length,
            failed: errors.length,
            errors,
            created
          });
        }
        
        res.json({ 
          message: `${created.length} HODs uploaded successfully`,
          success: created.length,
          failed: 0,
          created
        });
      } catch (err) {
        console.error('Error in bulkUploadHODs:', err);
        res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

// Bulk Upload Deans with CSV
exports.bulkUploadDeans = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a CSV file' });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];

  fs.createReadStream(filePath)
    .pipe(csvParser({
      mapHeaders: ({ header }) => header.trim().toLowerCase()
    }))
    .on('data', (row) => {
      results.push(row);
    })
    .on('end', async () => {
      try {
        const { generateStaffUID } = require('../utils/uidGenerator');
        const created = [];
        
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 2; // CSV row number (accounting for header)
          
          try {
            // Extract and validate required fields
            const name = row.name?.trim();
            const email = row.email?.trim();
            const password = row.password?.trim();
            const schoolName = row.school?.trim();
            const teacherIdRaw = row.teacherId?.trim();
            
            if (!name || !email || !password || !schoolName) {
              errors.push({ row: rowNum, message: 'Missing required fields (name, email, password, school)' });
              continue;
            }
            
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
              errors.push({ row: rowNum, message: `Email ${email} already exists` });
              continue;
            }
            
            // Find school
            const school = await School.findOne({ name: new RegExp(`^${schoolName}$`, 'i') });
            if (!school) {
              errors.push({ row: rowNum, message: `School "${schoolName}" not found` });
              continue;
            }
            
            // Check if school already has a Dean
            if (school.dean) {
              const existingDean = await User.findById(school.dean);
              if (existingDean) {
                errors.push({ row: rowNum, message: `School "${schoolName}" already has Dean: ${existingDean.name}` });
                continue;
              }
            }
            
            // Generate UID
            const uid = await generateStaffUID();
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Prepare Dean data
            const deanData = {
              name,
              email,
              password: hashedPassword,
              uid,
              role: 'dean',
              roles: ['dean'],
              primaryRole: 'dean',
              school: school._id,
              isActive: true,
              emailVerified: true
            };
            
            // Add teacherId if provided in CSV
            if (teacherIdRaw && teacherIdRaw.length > 0) {
              // Validate teacherId format (5 digits)
              if (!/^\d{5}$/.test(teacherIdRaw)) {
                errors.push({ row: rowNum, message: `Invalid teacherId format for ${email}. Expected 5 digits (e.g., 00001)` });
                continue;
              }
              
              // Check if teacherId already exists
              const existingTeacherId = await User.findOne({ teacherId: teacherIdRaw });
              if (existingTeacherId) {
                errors.push({ row: rowNum, message: `Teacher ID ${teacherIdRaw} already exists` });
                continue;
              }
              
              deanData.teacherId = teacherIdRaw;
            }
            // If not provided, pre-save hook will auto-generate
            
            // Create Dean
            const dean = await User.create(deanData);
            
            // Update school with Dean reference
            await School.findByIdAndUpdate(school._id, { dean: dean._id });
            
            created.push({
              name: dean.name,
              email: dean.email,
              uid: dean.uid,
              teacherId: dean.teacherId,
              school: school.name
            });
            
          } catch (rowErr) {
            errors.push({ row: rowNum, message: rowErr.message });
          }
        }
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        if (errors.length > 0) {
          return res.status(400).json({ 
            message: `Uploaded ${created.length} Deans with ${errors.length} errors`,
            success: created.length,
            failed: errors.length,
            errors,
            created
          });
        }
        
        res.json({ 
          message: `${created.length} Deans uploaded successfully`,
          success: created.length,
          failed: 0,
          created
        });
      } catch (err) {
        console.error('Error in bulkUploadDeans:', err);
        res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

// Reset teacher password
exports.resetTeacherPassword = async (req, res) => {
  try {
    const { teacherId, newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(teacherId, { password: hashedPassword });
  await AuditLog.create({ action: 'reset_teacher_password', performedBy: req.user._id, targetUser: teacherId });
  res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Deactivate teacher
exports.deactivateTeacher = async (req, res) => {
  try {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  await AuditLog.create({ action: 'deactivate_teacher', performedBy: req.user._id, targetUser: req.params.id });
  res.json({ message: 'Teacher deactivated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Add a single student with auto-generating registration number if not provided
exports.createStudent = async (req, res) => {
  try {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected when trying to create student');
      return res.status(500).json({ message: 'Database connection error. Please try again later.' });
    }
    
    console.log('Creating student with data:', req.body);
    const { name, email, password, regNo, school, department, section, roles } = req.body;
    
    // Validate required fields
    if (!school) {
      return res.status(400).json({ message: 'School is required for student admission' });
    }
    
    // Verify school exists
    const schoolExists = await require('../models/School').findById(school);
    if (!schoolExists) {
      return res.status(400).json({ message: 'Selected school not found' });
    }
    
    // Validate email format
    if (!email || !email.includes('@') || !email.includes('.')) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Normalized email:', normalizedEmail);
    
    // Check if student with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.log('User with email already exists:', normalizedEmail);
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if regNo is provided or generate a new one
    let studentRegNo = regNo;
    if (!studentRegNo) {
      // Generate a unique registration number with retry logic
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        // Find the highest existing regNo
        const highestStudent = await User.findOne(
          { regNo: { $regex: /^S\d{6}$/ } },
          { regNo: 1 },
          { sort: { regNo: -1 } }
        );
        
        let nextNumber = 1;
        if (highestStudent && highestStudent.regNo) {
          // Extract the number from existing regNo and increment
          const currentNumber = parseInt(highestStudent.regNo.substring(1), 10);
          nextNumber = currentNumber + 1;
        }
        
        // Format with leading zeros to ensure 6 digits
        studentRegNo = 'S' + nextNumber.toString().padStart(6, '0');
        
        // Check if this regNo already exists
        const existingStudent = await User.findOne({ regNo: studentRegNo });
        if (!existingStudent) {
          break; // Found a unique regNo
        }
        
        attempts++;
        console.log(`Registration number ${studentRegNo} already exists, trying again (attempt ${attempts})`);
      }
      
      if (attempts >= maxAttempts) {
        return res.status(500).json({ 
          message: 'Unable to generate a unique registration number. Please try again.' 
        });
      }
      
      console.log('Generated registration number:', studentRegNo);
    } else if (!studentRegNo.startsWith('S') || !/^S\d{6}$/.test(studentRegNo)) {
      console.log('Invalid registration number format:', studentRegNo);
      return res.status(400).json({ 
        message: 'Registration number format is invalid. It should start with S followed by 6 digits.' 
      });
    } else {
      // If regNo is provided, check if it already exists
      const existingStudent = await User.findOne({ regNo: studentRegNo });
      if (existingStudent) {
        return res.status(400).json({ 
          message: `Registration number ${studentRegNo} is already in use.` 
        });
      }
    }
    
    // Create the student
    
    // Generate UID for student
    const { generateStudentUID } = require('../utils/uidGenerator');
    const uid = await generateStudentUID();

    // Handle multi-role assignment (default to student if no roles provided)
    let userRoles = ['student'];
    let primaryRole = 'student';
    
    if (roles && Array.isArray(roles) && roles.length > 0) {
      userRoles = [...new Set(roles)]; // Remove duplicates
      primaryRole = roles[0];
    }

    const student = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      uid: uid,
      role: 'student', // Keep for backward compatibility
      roles: userRoles,
      primaryRole: primaryRole,
      regNo: studentRegNo, // Keep for backward compatibility (DEPRECATED - use uid instead)
      school: school, // Add school reference
      department: department || null // Add department reference
    });
    
    console.log('Saving student:', student);
    const savedStudent = await student.save();
    console.log('Student saved successfully:', savedStudent);
    
    // If section is provided, assign student to that section
    if (section) {
      try {
        const Section = require('../models/Section');
        const sectionDoc = await Section.findById(section);
        if (sectionDoc) {
          // Add student to section if not already assigned
          if (!sectionDoc.students.includes(savedStudent._id)) {
            sectionDoc.students.push(savedStudent._id);
            await sectionDoc.save();
            console.log(`Student ${savedStudent._id} assigned to section ${section}`);
          }
        } else {
          console.warn(`Section ${section} not found when creating student`);
        }
      } catch (sectionError) {
        console.error('Error assigning student to section:', sectionError);
        // Don't fail student creation if section assignment fails
      }
    }
    
    // Log the action
    await AuditLog.create({
      action: 'add_student',
      performedBy: req.user._id,
      targetUser: student._id,
      details: { name, email: normalizedEmail, regNo: studentRegNo, school: schoolExists.name }
    });
    
    res.status(201).json({
      _id: savedStudent._id,
      name: savedStudent.name,
      email: savedStudent.email,
      regNo: savedStudent.regNo,
      assignedSections: savedStudent.assignedSections || []
    });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(400).json({ message: err.message });
  }
};

// Add student via CSV
exports.bulkUploadStudents = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const rows = [];
  const headerIssues = [];
  const normalizedHeader = h => (h || '').trim().toLowerCase();
  const seenEmails = new Set();

  fs.createReadStream(req.file.path)
    .pipe(csv({ 
      mapHeaders: ({ header }) => normalizedHeader(header),
      skipEmptyLines: true,
      skipLinesWithError: false
    }))
    .on('data', (raw) => {
      const norm = {};
      Object.keys(raw).forEach(k => { norm[normalizedHeader(k)] = raw[k]; });
      rows.push(norm);
    })
    .on('end', async () => {
      const startedAt = Date.now();
      console.log(`[bulkUploadStudents] Start processing ${rows.length} rows`);
      try {
        if (rows.length === 0) {
          try { fs.unlinkSync(req.file.path); } catch (_) {}
          return res.status(400).json({ message: 'CSV file is empty' });
        }

        // Required logical columns (password now optional - will auto-generate if missing)
        const first = rows[0];
        const mustHaveAny = ['name', 'email', 'section'];
        const missing = mustHaveAny.filter(col => !Object.prototype.hasOwnProperty.call(first, col));
        if (missing.length) headerIssues.push(`Missing required header(s): ${missing.join(', ')}`);
        if (headerIssues.length) {
          try { fs.unlinkSync(req.file.path); } catch (_) {}
          return res.status(400).json({ message: 'Header validation failed', errors: headerIssues });
        }

        // Pre-fetch existing emails to cut DB calls
        const fileEmails = rows
          .map(r => (r.email || '').trim().toLowerCase())
          .filter(e => e !== '');
        const uniqueFileEmails = [...new Set(fileEmails)];
        const existingUsers = await User.find({ email: { $in: uniqueFileEmails } }, 'email');
        const existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

        // Find next reg number once (numeric format, 8+ digits for students)
        let nextRegNumber = 1;
        const highestStudent = await User.findOne(
          { 
            regNo: { $regex: /^\d{8,}$/ }, // 8 or more digits
            role: 'student'
          }, 
          { regNo: 1 }, 
          { sort: { regNo: -1 } }
        );
        if (highestStudent?.regNo) {
          nextRegNumber = parseInt(highestStudent.regNo, 10) + 1;
        }

        const results = [];
        const rowErrors = [];
        let successCount = 0;

        // Helper for password generation
        const genPassword = () => crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0,10);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
            const rowNum = i + 2; // counting header line as 1
          try {
            const nameRaw = (row.name || '').trim();
            const emailRaw = (row.email || '').trim().toLowerCase();
            const passwordRaw = (row.password || '').trim();
            const regRaw = (row.regno || row['reg no'] || row['reg_no'] || '').trim();
            const schoolRaw = (row.school || '').trim();
            const departmentRaw = (row.department || '').trim();
            const sectionRaw = (row.section || '').trim();
            let coursesRaw = (row.courseassigned || row.courseAssigned || row['course assigned'] || row.coursesassigned || '').trim();
            
            console.log(`[DEBUG] Row ${rowNum} - coursesRaw: "${coursesRaw}" (type: ${typeof coursesRaw})`);

            // Basic validation
            if (!nameRaw) throw new Error('Missing name');
            if (!emailRaw) throw new Error('Missing email');
            if (!sectionRaw) throw new Error('Missing section - students must be assigned to a section');
            if (!/^\S+@\S+\.\S+$/.test(emailRaw)) throw new Error('Invalid email format');
            if (seenEmails.has(emailRaw)) throw new Error('Duplicate email in CSV');
            seenEmails.add(emailRaw);
            if (existingEmailSet.has(emailRaw)) throw new Error('Email already exists');

            // RegNo validation/generation (numeric format: 8+ digits for students)
            let regNoVal = regRaw;
            if (regNoVal) {
              // If regNo is provided, validate format (must be 8+ digits)
              if (!/^\d{8,}$/.test(regNoVal)) {
                throw new Error('Invalid registration number format (expected 8 or more digits, e.g., 00000001)');
              }
              // Check if this regNo already exists in the database
              const existingRegNo = await User.findOne({ regNo: regNoVal });
              if (existingRegNo) {
                throw new Error(`Registration number ${regNoVal} already exists`);
              }
            } else {
              // Auto-generate regNo if not provided (8-digit format)
              regNoVal = nextRegNumber.toString().padStart(8, '0');
              nextRegNumber++;
            }

            // Courses parsing: support comma, semicolon, bracket lists
            let courseTokens = [];
            if (coursesRaw) {
              let rawStr = coursesRaw.trim();
              
              // Handle JSON array format like ["C000001","C000002"] or ['C000001','C000002']
              if (rawStr.startsWith('[') && rawStr.endsWith(']')) {
                try {
                  // Try to parse as JSON array
                  const parsed = JSON.parse(rawStr.replace(/'/g, '"'));
                  if (Array.isArray(parsed)) {
                    courseTokens = parsed.map(v => String(v).trim()).filter(Boolean);
                  } else if (parsed) {
                    courseTokens = [String(parsed).trim()];
                  }
                } catch (e) {
                  // Fallback: remove brackets and split by delimiter
                  rawStr = rawStr.slice(1, -1);
                  courseTokens = rawStr.split(/[;,]/).map(s => s.replace(/['"\s]/g, '')).filter(Boolean);
                }
              } else {
                // Handle simple comma/semicolon separated values
                courseTokens = rawStr.split(/[;,]/).map(s => s.trim()).filter(Boolean);
              }
            }

            let resolvedCourses = [];
            if (courseTokens.length > 0) {
              console.log(`[DEBUG] Row ${rowNum} - courseTokens before resolve:`, courseTokens);
              const { ids, notFound } = await resolveCourseIdentifiers(courseTokens);
              console.log(`[DEBUG] Row ${rowNum} - resolved course IDs:`, ids);
              console.log(`[DEBUG] Row ${rowNum} - not found courses:`, notFound);
              
              // The resolveCourseIdentifiers already returns ObjectId strings, just use them directly
              resolvedCourses = ids;
              if (notFound.length) {
                console.warn(`[bulkUploadStudents] Row ${rowNum} unresolved course identifiers: ${notFound.join(', ')}`);
              }
            }
            
            console.log(`[DEBUG] Row ${rowNum} - final resolvedCourses:`, resolvedCourses);

            // Resolve school, department, and section if provided
            let schoolId = null, departmentId = null, sectionId = null;
            
            if (schoolRaw) {
              const School = require('../models/School');
              const school = await School.findOne({
                $or: [
                  { _id: mongoose.Types.ObjectId.isValid(schoolRaw) ? schoolRaw : null },
                  { code: schoolRaw },
                  { name: { $regex: new RegExp('^' + schoolRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
                ]
              });
              if (school) schoolId = school._id;
            }
            
            if (departmentRaw) {
              const Department = require('../models/Department');
              const department = await Department.findOne({
                $or: [
                  { _id: mongoose.Types.ObjectId.isValid(departmentRaw) ? departmentRaw : null },
                  { code: departmentRaw },
                  { name: { $regex: new RegExp('^' + departmentRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
                ]
              });
              if (department) departmentId = department._id;
            }
            
            if (sectionRaw) {
              const Section = require('../models/Section');
              const section = await Section.findOne({
                $or: [
                  { _id: mongoose.Types.ObjectId.isValid(sectionRaw) ? sectionRaw : null },
                  { name: { $regex: new RegExp('^' + sectionRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
                ]
              });
              if (!section) {
                throw new Error(`Section '${sectionRaw}' not found`);
              }
              sectionId = section._id;
            }

            const finalPassword = passwordRaw || genPassword();
            const hashedPassword = await bcrypt.hash(finalPassword, 10);
            
            // Generate UID for student
            const { generateStudentUID } = require('../utils/uidGenerator');
            const uid = await generateStudentUID();

            // Validate that section exists and is required
            if (!sectionId) {
              throw new Error('Section is required and must be valid');
            }

            const student = new User({
              regNo: regNoVal, // Keep for backward compatibility (DEPRECATED - use uid instead)
              uid: uid,
              name: nameRaw,
              email: emailRaw,
              password: hashedPassword,
              role: 'student',
              school: schoolId,
              department: departmentId,
              coursesAssigned: resolvedCourses
            });
            const savedStudent = await student.save();
            
            // Assign student to section - this is now mandatory
            try {
              const Section = require('../models/Section');
              const sectionDoc = await Section.findById(sectionId);
              if (!sectionDoc) {
                // Delete the student we just created since section assignment failed
                await User.findByIdAndDelete(savedStudent._id);
                throw new Error(`Section ${sectionId} not found during assignment`);
              }
              
              if (!sectionDoc.students.includes(savedStudent._id)) {
                sectionDoc.students.push(savedStudent._id);
                await sectionDoc.save();
              }
            } catch (sectionError) {
              // Delete the student we just created since section assignment failed
              await User.findByIdAndDelete(savedStudent._id);
              throw new Error(`Failed to assign student to section: ${sectionError.message}`);
            }
            successCount++;
            results.push({ row: rowNum, regNo: regNoVal, email: emailRaw, generatedPassword: passwordRaw ? null : finalPassword });
            await AuditLog.create({
              action: 'bulk_add_student',
              performedBy: req.user._id,
              targetUser: student._id,
              details: { regNo: regNoVal, name: nameRaw, email: emailRaw }
            });
          } catch (err) {
            rowErrors.push({ row: rowNum, message: err.message });
          }
        }

        try { fs.unlinkSync(req.file.path); } catch (_) {}

        const durationMs = Date.now() - startedAt;
        console.log(`[bulkUploadStudents] Completed: ${successCount} success, ${rowErrors.length} failed in ${durationMs}ms`);

        const status = rowErrors.length ? 207 : 200;
        return res.status(status).json({
          message: `Processed ${rows.length} rows: ${successCount} succeeded, ${rowErrors.length} failed`,
            total: rows.length,
          success: successCount,
          failed: rowErrors.length,
          results,
          errors: rowErrors
        });
      } catch (err) {
        console.error('[bulkUploadStudents] Fatal error:', err);
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('[bulkUploadStudents] CSV parsing error:', err);
      return res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

// Bulk upload departments via CSV
exports.bulkUploadSchools = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No CSV file uploaded' });
  }

  const rows = [];
  const rowErrors = [];
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase()
    }))
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      try {
        console.log(`[bulkUploadSchools] Processing ${rows.length} schools`);

        for (let i = 0; i < rows.length; i++) {
          const rowNum = i + 2;
          const row = rows[i];

          try {
            // Extract and validate fields
            const name = row.name?.trim();
            const code = row.code?.trim();
            const description = row.description?.trim();

            // Validation
            if (!name) {
              throw new Error('School name is required');
            }

            if (!code) {
              throw new Error('School code is required');
            }

            // Validate code format (2-5 uppercase letters)
            if (!/^[A-Z]{2,5}$/.test(code)) {
              throw new Error('School code must be 2-5 uppercase letters (e.g., SOE, SOM)');
            }

            if (!description) {
              throw new Error('School description is required');
            }

            // Check if school already exists
            const existingSchool = await School.findOne({
              $or: [
                { code: code },
                { name: { $regex: new RegExp(`^${name}$`, 'i') } }
              ]
            });

            if (existingSchool) {
              throw new Error(`School already exists: ${name} (${code})`);
            }

            // Create school
            const school = await School.create({
              name,
              code,
              description
            });

            successCount++;
            console.log(`✓ Row ${rowNum}: Created school ${name} (${code})`);

          } catch (err) {
            rowErrors.push({ row: rowNum, error: err.message });
            console.error(`✗ Row ${rowNum}: ${err.message}`);
          }
        }

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        // Response
        if (rowErrors.length > 0) {
          return res.status(207).json({
            message: `Bulk upload completed with errors. ${successCount} succeeded, ${rowErrors.length} failed.`,
            successCount,
            errors: rowErrors
          });
        }

        res.json({
          message: `Successfully created ${successCount} schools`,
          successCount
        });

      } catch (err) {
        console.error('[bulkUploadSchools] Fatal error:', err);
        return res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('[bulkUploadSchools] Stream error:', err);
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ message: 'Error reading CSV file' });
    });
};

exports.bulkUploadDepartments = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No CSV file uploaded' });
  }

  const rows = [];
  const rowErrors = [];
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase()
    }))
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      try {
        console.log(`[bulkUploadDepartments] Processing ${rows.length} departments`);

        for (let i = 0; i < rows.length; i++) {
          const rowNum = i + 2;
          const row = rows[i];

          try {
            // Extract and validate fields
            const name = row.name?.trim();
            const code = row.code?.trim();
            const schoolIdentifier = row.school?.trim();

            // Validation
            if (!name) {
              throw new Error('Department name is required');
            }

            if (!code) {
              throw new Error('Department code is required');
            }

            if (!schoolIdentifier) {
              throw new Error('School is required');
            }

            // Find school by name or code
            const school = await School.findOne({
              $or: [
                { name: { $regex: new RegExp(`^${schoolIdentifier}$`, 'i') } },
                { code: { $regex: new RegExp(`^${schoolIdentifier}$`, 'i') } }
              ]
            });

            if (!school) {
              throw new Error(`School not found: ${schoolIdentifier}`);
            }

            // Check if department already exists
            const existingDept = await Department.findOne({
              $or: [
                { code: code, school: school._id },
                { name: name, school: school._id }
              ]
            });

            if (existingDept) {
              throw new Error(`Department already exists: ${name} (${code}) in ${school.name}`);
            }

            // Create department
            const department = await Department.create({
              name,
              code,
              school: school._id
            });

            successCount++;
            console.log(`✓ Row ${rowNum}: Created department ${name} (${code})`);

          } catch (err) {
            rowErrors.push({ row: rowNum, error: err.message });
            console.error(`✗ Row ${rowNum}: ${err.message}`);
          }
        }

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        // Response
        if (rowErrors.length > 0) {
          return res.status(207).json({
            message: `Bulk upload completed with errors. ${successCount} succeeded, ${rowErrors.length} failed.`,
            successCount,
            errors: rowErrors
          });
        }

        res.json({
          message: `Successfully created ${successCount} departments`,
          successCount
        });

      } catch (err) {
        console.error('[bulkUploadDepartments] Fatal error:', err);
        return res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('[bulkUploadDepartments] CSV parsing error:', err);
      return res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

// Bulk upload sections via CSV
exports.bulkUploadSections = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No CSV file uploaded' });
  }

  const rows = [];
  const rowErrors = [];
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase()
    }))
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      try {
        console.log(`[bulkUploadSections] Processing ${rows.length} sections`);

        for (let i = 0; i < rows.length; i++) {
          const rowNum = i + 2;
          const row = rows[i];

          try {
            // Extract and validate fields
            const name = row.name?.trim();
            const schoolIdentifier = row.school?.trim();
            const departmentIdentifier = row.department?.trim();

            // Validation
            if (!name) {
              throw new Error('Section name is required');
            }

            if (!schoolIdentifier) {
              throw new Error('School is required');
            }

            if (!departmentIdentifier) {
              throw new Error('Department is required');
            }

            // Find school by name or code
            const school = await School.findOne({
              $or: [
                { name: { $regex: new RegExp(`^${schoolIdentifier}$`, 'i') } },
                { code: { $regex: new RegExp(`^${schoolIdentifier}$`, 'i') } }
              ]
            });

            if (!school) {
              throw new Error(`School not found: ${schoolIdentifier}`);
            }

            // Find department by name or code within the school
            const department = await Department.findOne({
              school: school._id,
              $or: [
                { name: { $regex: new RegExp(`^${departmentIdentifier}$`, 'i') } },
                { code: { $regex: new RegExp(`^${departmentIdentifier}$`, 'i') } }
              ]
            });

            if (!department) {
              throw new Error(`Department not found: ${departmentIdentifier} in ${school.name}`);
            }

            // Check if section already exists
            const Section = require('../models/Section');
            const existingSection = await Section.findOne({
              name: { $regex: new RegExp(`^${name}$`, 'i') },
              school: school._id,
              department: department._id
            });

            if (existingSection) {
              throw new Error(`Section already exists: ${name} in ${department.name}`);
            }

            // Create section
            const section = await Section.create({
              name,
              school: school._id,
              department: department._id
            });

            successCount++;
            console.log(`✓ Row ${rowNum}: Created section ${name} in ${department.name}`);

          } catch (err) {
            rowErrors.push({ row: rowNum, error: err.message });
            console.error(`✗ Row ${rowNum}: ${err.message}`);
          }
        }

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        // Response
        if (rowErrors.length > 0) {
          return res.status(207).json({
            message: `Bulk upload completed with errors. ${successCount} succeeded, ${rowErrors.length} failed.`,
            successCount,
            errors: rowErrors
          });
        }

        res.json({
          message: `Successfully created ${successCount} sections`,
          successCount
        });

      } catch (err) {
        console.error('[bulkUploadSections] Fatal error:', err);
        return res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('[bulkUploadSections] CSV parsing error:', err);
      return res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};


// Batch/multi course assignment with condition and history
exports.assignCourses = async (req, res) => {
  try {
    const { studentIds, courseIds, condition } = req.body;
    if (!Array.isArray(studentIds) || !Array.isArray(courseIds)) return res.status(400).json({ message: 'Invalid input' });
    // Optionally filter students by condition (e.g., grade/year)
    let students = await User.find({ _id: { $in: studentIds }, role: 'student' });
    if (condition) {
      // Example: condition = 'grade:10' or 'year:2025'
      const [field, value] = condition.split(':');
      students = students.filter(s => String(s[field]) === value);
    }
    for (const student of students) {
      for (const courseId of courseIds) {
        if (!student.coursesAssigned.includes(courseId)) {
          student.coursesAssigned.push(courseId);
        }
      }
      await student.save();
      await AssignmentHistory.create({ student: student._id, courses: courseIds, assignedBy: req.user._id, condition });
      await AuditLog.create({ action: 'assign_courses', performedBy: req.user._id, targetUser: student._id, details: { courseIds, condition } });
    }
    res.json({ message: 'Courses assigned', count: students.length });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get assignment history for a student
exports.getAssignmentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const history = await AssignmentHistory.find({ student: studentId }).populate('courses', 'title').populate('assignedBy', 'email').sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Edit/remove student access
exports.editStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Allow single field alias 'courseAssigned'
    if (!updates.coursesAssigned && updates.courseAssigned) {
      updates.coursesAssigned = updates.courseAssigned;
      delete updates.courseAssigned;
    }

    if (updates.coursesAssigned) {
      // Normalize to array of strings
      let rawList = updates.coursesAssigned;
      if (typeof rawList === 'string') {
        let trimmed = rawList.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed.replace(/'/g, '"'));
            if (Array.isArray(parsed)) rawList = parsed; else rawList = [parsed];
          } catch (_) {
            // fallback split by comma / semicolon
            trimmed = trimmed.slice(1, -1); // remove brackets
            rawList = trimmed.split(/[;,]/).map(s => s.replace(/['"\s]/g, '')).filter(Boolean);
          }
        } else {
          rawList = trimmed.split(/[;,]/).map(s => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(rawList)) rawList = [String(rawList)];
      // Resolve each identifier (ObjectId or courseCode)
      const { ids, notFound } = await resolveCourseIdentifiers(rawList.map(String));
      if (rawList.length && ids.length === 0) {
        return res.status(400).json({ message: 'No provided course identifiers could be resolved', notFound });
      }
      if (notFound.length > 0) {
        console.warn(`[editStudent] Unresolved course identifiers for student ${id}:`, notFound);
      }
      updates.coursesAssigned = ids; // Replace with resolved ObjectIds
    }

    await User.findByIdAndUpdate(id, updates);
    await AuditLog.create({ action: 'edit_student', performedBy: req.user._id, targetUser: id, details: updates });
    res.json({ message: 'Student updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.removeStudent = async (req, res) => {
  try {
  await User.findByIdAndDelete(req.params.id);
  await AuditLog.create({ action: 'remove_student', performedBy: req.user._id, targetUser: req.params.id });
  res.json({ message: 'Student removed' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Course management
exports.createCourse = async (req, res) => {
  try {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected when trying to create course');
      return res.status(500).json({ message: 'Database connection error. Please try again later.' });
    }
    
    console.log('Creating course with data:', req.body);
    const { title, description, teacherIds, school, department } = req.body;
    
    // Validate required fields
    if (!school) {
      return res.status(400).json({ message: 'School is required for course creation' });
    }
    
    if (!department) {
      return res.status(400).json({ message: 'Department is required for course creation' });
    }
    
    // Verify school and department exist
    const School = require('../models/School');
    const Department = require('../models/Department');
    
    const schoolExists = await School.findById(school);
    if (!schoolExists) {
      return res.status(400).json({ message: 'Selected school not found' });
    }
    
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({ message: 'Selected department not found' });
    }
    
    // Verify department belongs to the selected school
    if (departmentExists.school.toString() !== school) {
      return res.status(400).json({ message: 'Selected department does not belong to the selected school' });
    }
    
    // Validate teacher IDs if provided
    let teacherObjectIds = [];
    if (teacherIds && Array.isArray(teacherIds)) {
      // Get User IDs from the teacherIds
      for (const teacherId of teacherIds) {
        const teacher = await User.findOne({ teacherId, role: 'teacher' });
        if (!teacher) {
          console.log(`Teacher ID ${teacherId} not found`);
          return res.status(400).json({ message: `Teacher ID ${teacherId} not found` });
        }
        teacherObjectIds.push(teacher._id);
      }
    } else if (teacherIds && typeof teacherIds === 'string') {
      // If a single teacherId is provided as string
      const teacher = await User.findOne({ teacherId: teacherIds, role: 'teacher' });
      if (!teacher) {
        console.log(`Teacher ID ${teacherIds} not found`);
        return res.status(400).json({ message: `Teacher ID ${teacherIds} not found` });
      }
      teacherObjectIds.push(teacher._id);
    }
    
    // Generate a unique course code (C + 6 digits)
    let courseCode;
    let isUnique = false;
    
    while (!isUnique) {
      // Find the highest existing course code
      const highestCourse = await Course.findOne(
        { courseCode: { $regex: /^C\d{6}$/ } },
        { courseCode: 1 },
        { sort: { courseCode: -1 } }
      );
      
      let nextNumber = 1;
      if (highestCourse && highestCourse.courseCode) {
        // Extract the number from existing course code and increment
        const currentNumber = parseInt(highestCourse.courseCode.substring(1), 10);
        nextNumber = currentNumber + 1;
      }
      
      // Format with leading zeros to ensure 6 digits
      courseCode = 'C' + nextNumber.toString().padStart(6, '0');
      
      // Check if this code is already in use
      const existingCourse = await Course.findOne({ courseCode });
      if (!existingCourse) {
        isUnique = true;
      }
    }
    
    console.log('Generated course code:', courseCode);
    
    const course = new Course({ 
      courseCode,
      title, 
      description, 
      school,
      department,
      teachers: teacherObjectIds 
    });
    
    console.log('Saving course:', course);
    const savedCourse = await course.save();
    console.log('Course saved successfully:', savedCourse);
    
    // Update each teacher's coursesAssigned array with the new course
    for (const teacherId of teacherObjectIds) {
      await User.findByIdAndUpdate(teacherId, {
        $addToSet: { coursesAssigned: course._id }
      });
    }
    
    await AuditLog.create({ 
      action: 'create_course', 
      performedBy: req.user._id, 
      details: { 
        courseCode, 
        title, 
        description, 
        school: schoolExists.name,
        department: departmentExists.name,
        teacherIds
      } 
    });
    
    res.status(201).json(savedCourse);
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.editCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If teacherIds is in the updates, process them
    if (updates.teacherIds) {
      let teacherObjectIds = [];
      // Handle array of teacher IDs
      if (Array.isArray(updates.teacherIds)) {
        for (const teacherId of updates.teacherIds) {
          const teacher = await User.findOne({ teacherId, role: 'teacher' });
          if (!teacher) {
            return res.status(400).json({ message: `Teacher ID ${teacherId} not found` });
          }
          teacherObjectIds.push(teacher._id);
          
          // Add the course to the teacher's coursesAssigned array
          await User.findByIdAndUpdate(teacher._id, {
            $addToSet: { coursesAssigned: id }
          });
        }
      } else if (typeof updates.teacherIds === 'string') {
        // Handle single teacher ID
        const teacher = await User.findOne({ teacherId: updates.teacherIds, role: 'teacher' });
        if (!teacher) {
          return res.status(400).json({ message: `Teacher ID ${updates.teacherIds} not found` });
        }
        teacherObjectIds.push(teacher._id);
        
        // Add the course to the teacher's coursesAssigned array
        await User.findByIdAndUpdate(teacher._id, {
          $addToSet: { coursesAssigned: id }
        });
      }
      
      // Replace teacherIds with teachers array of ObjectIds
      delete updates.teacherIds;
      updates.teachers = teacherObjectIds;
    }
    
    await Course.findByIdAndUpdate(id, updates);
    await AuditLog.create({ action: 'edit_course', performedBy: req.user._id, details: { id, updates } });
    res.json({ message: 'Course updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Bulk upload courses via CSV with validation and error reporting
exports.bulkUploadCourses = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  console.log('Starting bulk course upload, file path:', req.file.path);
  
  const results = [];
  const errors = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase() // Normalize headers
    }))
    .on('data', (data) => {
      // Normalize the data object to ensure keys are lowercase
      const normalizedData = {};
      Object.keys(data).forEach(key => {
        normalizedData[key.toLowerCase().trim()] = data[key];
      });
      results.push(normalizedData);
    })
    .on('end', async () => {
      try {
        // Validate all rows first
        console.log(`Processing ${results.length} rows from CSV for courses`);
        
        // Check for basic required fields in the CSV
        if (results.length > 0) {
          const firstRow = results[0];
          console.log('First row headers:', Object.keys(firstRow));
          
          const requiredFields = ['title', 'description'];
          const missingHeaders = requiredFields.filter(field => 
            !Object.keys(firstRow).some(key => key.toLowerCase() === field)
          );
          
          if (missingHeaders.length > 0) {
            console.log('Missing headers in CSV:', missingHeaders);
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
              message: `CSV is missing required headers: ${missingHeaders.join(', ')}. Please use the template.` 
            });
          }
        }
        
        // Validate each row
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 2; // header is row 1
          
          if (!row.title || row.title.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: title' });
          }
          
          if (!row.description || row.description.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: description' });
          }
          
          // Validate course code if provided
          if (row.coursecode && row.coursecode.trim()) {
            const courseCode = row.coursecode.trim();
            
            // Check if this course code already exists
            const existingCourse = await Course.findOne({ courseCode });
            if (existingCourse) {
              errors.push({
                row: rowNum,
                message: `Course code ${courseCode} already exists in the system`
              });
            }
          }
        }
        
        if (errors.length > 0) {
          console.log('Validation errors in CSV:', errors);
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'Validation failed', errors });
        }
        
        // Find the highest existing course code for auto-generation
        let nextCourseNumber = 1;
        const highestCourse = await Course.findOne(
          { courseCode: { $regex: /^C\d{6}$/ } },
          { courseCode: 1 },
          { sort: { courseCode: -1 } }
        );
        
        if (highestCourse && highestCourse.courseCode) {
          // Extract the number from existing course code and increment
          const currentNumber = parseInt(highestCourse.courseCode.substring(1), 10);
          nextCourseNumber = currentNumber + 1;
        }
        
        console.log('Next course number for auto-generation:', nextCourseNumber);
        
        // If valid, insert all courses
        const createdCourses = [];
        for (const row of results) {
          const title = row.title ? row.title.trim() : '';
          const description = row.description ? row.description.trim() : '';
          const credits = row.credits ? parseInt(row.credits, 10) : 3; // Default 3 credits
          
          // School and Department lookup (REQUIRED)
          const schoolName = row.school ? row.school.trim() : '';
          const departmentName = row.department ? row.department.trim() : '';
          
          // Find school by name, code, or ObjectId
          const school = await School.findOne({
            $or: [
              { name: schoolName },
              { code: schoolName },
              { _id: mongoose.Types.ObjectId.isValid(schoolName) ? schoolName : null }
            ]
          });
          
          if (!school) {
            errors.push({ row: results.indexOf(row) + 2, message: `School '${schoolName}' not found` });
            continue;
          }
          
          // Find department by name, code (within the school)
          const department = await Department.findOne({
            $or: [
              { name: departmentName, school: school._id },
              { code: departmentName, school: school._id },
              { _id: mongoose.Types.ObjectId.isValid(departmentName) ? departmentName : null }
            ]
          });
          
          if (!department) {
            errors.push({ row: results.indexOf(row) + 2, message: `Department '${departmentName}' not found in ${school.name}` });
            continue;
          }
          
          // Use provided course code or generate a new one
          let courseCode = row.coursecode ? row.coursecode.trim() : '';
          if (!courseCode) {
            // Format with leading zeros to ensure 6 digits
            courseCode = 'C' + nextCourseNumber.toString().padStart(6, '0');
            nextCourseNumber++; // Increment for next course
          }
          
          // Optional metadata fields
          const semester = row.semester ? row.semester.trim() : '';
          const level = row.level ? row.level.trim().toLowerCase() : 'beginner';
          const isActive = row.isactive === 'false' ? false : true; // Default true
          const academicYear = row.academicyear ? row.academicyear.trim() : '';
          
          // Handle prerequisites (semicolon or comma separated course codes)
          let prerequisiteCourses = [];
          if (row.prerequisite && row.prerequisite.trim()) {
            const prereqCodes = row.prerequisite.split(/[;,]/).map(code => code.trim()).filter(code => code);
            for (const prereqCode of prereqCodes) {
              const prereqCourse = await Course.findOne({ courseCode: prereqCode });
              if (prereqCourse) {
                prerequisiteCourses.push(prereqCourse._id);
              }
            }
          }
          
          console.log(`Creating course: ${title}, code: ${courseCode}, school: ${school.name}, dept: ${department.name}, credits: ${credits}`);
          
          // Create course without teachers (assigned via Section-Course-Teacher later)
          const course = new Course({ 
            courseCode,
            title, 
            description,
            credits,
            school: school._id,  // ObjectId reference
            department: department._id,  // ObjectId reference
            semester,
            level: ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner',
            prerequisite: prerequisiteCourses,
            academicYear,
            isActive,
            teachers: [] // No direct teacher assignment
          });
          
          console.log('Saving course:', course);
          const savedCourse = await course.save();
          console.log('Course saved successfully:', savedCourse);
          
          createdCourses.push(course);
          
          await AuditLog.create({ 
            action: 'bulk_add_course', 
            performedBy: req.user._id, 
            details: { 
              courseCode, 
              title, 
              description, 
              credits, 
              school: school.name, 
              department: department.name,
              semester,
              level
            } 
          });
        }
        
        // Report any errors that occurred during course creation
        if (errors.length > 0) {
          console.log('Some courses failed to create:', errors);
          fs.unlinkSync(req.file.path);
          return res.status(207).json({
            message: `Created ${createdCourses.length} courses, ${errors.length} failed`,
            success: createdCourses.length,
            failed: errors.length,
            courses: createdCourses,
            errors
          });
        }
        
        fs.unlinkSync(req.file.path);
        console.log(`Successfully created ${createdCourses.length} courses`);
        res.status(201).json({ 
          message: `Successfully created ${createdCourses.length} courses`, 
          courses: createdCourses 
        });
      } catch (err) {
        console.error('Error in bulkUploadCourses:', err);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error processing CSV file', error: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

exports.deleteCourse = async (req, res) => {
  try {
  await Course.findByIdAndDelete(req.params.id);
  await AuditLog.create({ action: 'delete_course', performedBy: req.user._id, details: { id: req.params.id } });
  res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get course details
exports.getCourseDetails = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Find the course with populated school and department
    const course = await Course.findById(courseId)
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('videos')
      .populate('units');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get teachers assigned to this course through sections
    const Section = require('../models/Section');
    const sections = await Section.find({ courses: courseId })
      .populate('teacher', 'name email teacherId')
      .populate('students', 'name email regNo');
    
    // Extract unique teachers from sections
    const teachers = [];
    const teacherIds = new Set();
    
    sections.forEach(section => {
      if (section.teacher && !teacherIds.has(section.teacher._id.toString())) {
        teachers.push(section.teacher);
        teacherIds.add(section.teacher._id.toString());
      }
    });
    
    // Get units for the course
    const Unit = require('../models/Unit');
    const units = await Unit.find({ course: courseId })
      .sort('order')
      .populate('videos', 'title description videoUrl duration sequence')
      .populate('readingMaterials', 'title description contentType order')
      // include questions minimally so frontend can fallback length; avoid sending answers separately endpoint provides details
      .populate('quizzes', 'title description isActive questions')
      .populate('quizPool', 'title description');
    
    // Get quiz pools for the course
    const QuizPool = require('../models/QuizPool');
    const Quiz = require('../models/Quiz');
    
    // Populate quiz pools for each unit and count questions
    for (const unit of units) {
      // Get quiz pools for this unit
      const quizPools = await QuizPool.find({ 
        unit: unit._id,
        isActive: true 
      })
        .select('_id title description quizzes createdBy contributors')
        .populate('createdBy', 'name email')
        .populate('contributors', 'name email');
      
      // Add quiz pools to the unit
      unit.quizPools = [];
      
      // Process each quiz pool to count questions
      for (const pool of quizPools) {
        // Get all quizzes in this pool
        const quizzes = await Quiz.find({ _id: { $in: pool.quizzes } });
        
        // Count total questions across all quizzes
        let questionCount = 0;
        quizzes.forEach(quiz => {
          questionCount += quiz.questions ? quiz.questions.length : 0;
        });
        
        // Add the quiz pool with question count to the unit
        unit.quizPools.push({
          ...pool.toObject(),
          questionCount: questionCount,
          contributors: pool.contributors || [],
          createdBy: pool.createdBy || null
        });
      }
      
      // Also ensure question count for individual quizzes (avoid extra DB call if questions already populated)
      if (unit.quizzes && unit.quizzes.length > 0) {
        unit.quizzes = unit.quizzes.map(q => {
          const qObj = q.toObject ? q.toObject() : q;
          return {
            _id: qObj._id,
            title: qObj.title,
            description: qObj.description,
            isActive: qObj.isActive,
            questionCount: Array.isArray(qObj.questions) ? qObj.questions.length : 0
          };
        });
      }
    }
    // Convert units to plain objects so added quizPools & quiz questionCount reliably serialized
    const unitsResponse = units.map(u => ({
      _id: u._id,
      title: u.title,
      description: u.description,
      order: u.order,
      videos: (u.videos || []).map(v => ({
        _id: v._id,
        title: v.title,
        description: v.description,
        videoUrl: v.videoUrl && v.videoUrl.startsWith('http') ? v.videoUrl : `${req.protocol}://${req.get('host')}/${(v.videoUrl || '').replace(/\\/g, '/')}`,
        duration: v.duration || 0,
        sequence: v.sequence
      })),
      readingMaterials: (u.readingMaterials || []).map(r => ({
        _id: r._id,
        title: r.title,
        description: r.description,
        contentType: r.contentType,
        order: r.order
      })),
      quizzes: u.quizzes || [],
      quizPools: u.quizPools || []
    }));
    // Get students assigned to this course
    const students = await User.find({
      coursesAssigned: courseId,
      role: 'student'
    }).select('_id');
    
    // Calculate overall progress if we have watch history data
    let overallProgress = 0;
    if (course.videos && course.videos.length > 0) {
      const allStudents = await User.find({
        coursesAssigned: courseId,
        role: 'student'
      }).select('watchHistory');
      
      const videoIds = course.videos.map(video => video._id);
      let totalWatchedVideos = 0;
      let totalPossibleWatches = videoIds.length * allStudents.length;
      
      if (totalPossibleWatches > 0) {
        for (const student of allStudents) {
          for (const videoId of videoIds) {
            const watched = student.watchHistory.some(item => 
              item.video && item.video.toString() === videoId.toString() && item.timeSpent > 0
            );
            
            if (watched) {
              totalWatchedVideos++;
            }
          }
        }
        
        overallProgress = Math.round((totalWatchedVideos / totalPossibleWatches) * 100);
      }
    }
    
    // Construct the response
    const response = {
      _id: course._id,
      courseCode: course.courseCode,
      title: course.title,
      description: course.description,
      school: course.school,
      department: course.department,
      teachers: teachers, // Use the extracted teachers from sections
      overallProgress,
      studentsCount: sections.reduce((total, section) => total + (section.students ? section.students.length : 0), 0),
      videosCount: course.videos.length,
      units: unitsResponse || [],
      hasUnits: unitsResponse && unitsResponse.length > 0,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    };
    
    res.json(response);
  } catch (err) {
    console.error('Error getting course details:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get course videos
// Debug endpoint to check video data
exports.debugVideos = async (req, res) => {
  try {
    const Video = require('../models/Video');
    const videos = await Video.find().limit(5).select('title videoUrl duration createdAt');
    console.log('Sample videos from database:', videos);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCourseVideos = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Find all videos for this course
    const videos = await Video.find({ course: courseId })
      .populate('teacher', 'name email teacherId');
    
    if (!videos || videos.length === 0) {
      return res.json([]);
    }
    
    // Get all students for this course to calculate completion rates
    const students = await User.find({
      coursesAssigned: courseId,
      role: 'student'
    }).select('watchHistory');
    
    // Calculate analytics for each video
    const videoData = videos.map(video => {
      let views = 0;
      let totalWatchTime = 0;
      let completedViews = 0;
      
      for (const student of students) {
        const watchRecord = student.watchHistory.find(item => 
          item.video && item.video.toString() === video._id.toString()
        );
        
        if (watchRecord && watchRecord.timeSpent > 0) {
          views++;
          totalWatchTime += watchRecord.timeSpent;
          
          // Count as completed if watched more than 90% of the video
          if (video.duration && watchRecord.timeSpent >= video.duration * 0.9) {
            completedViews++;
          }
        }
      }
      
      const completionRate = students.length > 0 
        ? Math.round((completedViews / students.length) * 100) 
        : 0;
      
      return {
        _id: video._id,
        title: video.title,
        description: video.description,
        url: video.videoUrl.startsWith('http') ? video.videoUrl : `${req.protocol}://${req.get('host')}/${video.videoUrl.replace(/\\/g, '/')}`,
        thumbnail: video.thumbnail || null,
        duration: video.duration || 0,
        teacherName: video.teacher ? video.teacher.name : 'Unknown',
        uploadDate: video.createdAt,
        views,
        completionRate,
        warned: video.warned || false
      };
    });
    
    res.json(videoData);
  } catch (err) {
    console.error('Error getting course videos:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get students assigned to a course
exports.getCourseStudents = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Find all students assigned to this course
    const students = await User.find({
      coursesAssigned: courseId,
      role: 'student'
    }).select('_id name email regNo isActive');
    
    if (!students || students.length === 0) {
      return res.json([]);
    }
    
    // Get course videos
    const course = await Course.findById(courseId).populate('videos');
    const videoIds = course.videos.map(video => video._id);
    
    // Calculate progress for each student
    const studentData = await Promise.all(students.map(async (student) => {
      // Get watch history for this student
      const studentWithHistory = await User.findById(student._id).select('watchHistory');
      
      let videosWatched = 0;
      let totalWatchTime = 0;
      
      // Count videos watched by this student
      for (const videoId of videoIds) {
        const watchRecord = studentWithHistory.watchHistory.find(item => 
          item.video && item.video.toString() === videoId.toString() && item.timeSpent > 0
        );
        
        if (watchRecord) {
          videosWatched++;
          totalWatchTime += watchRecord.timeSpent;
        }
      }
      
      // Calculate progress percentage
      const progress = videoIds.length > 0 
        ? Math.round((videosWatched / videoIds.length) * 100) 
        : 0;
      
      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        regNo: student.regNo,
        isActive: student.isActive,
        progress,
        videosWatched,
        totalVideos: videoIds.length,
        totalWatchTime
      };
    }));
    
    res.json(studentData);
  } catch (err) {
    console.error('Error getting course students:', err);
    res.status(500).json({ message: err.message });
  }
};

// Dean Management Functions
exports.createDean = async (req, res) => {
  try {
    const { name, email, password, schoolId } = req.body;
    
    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(400).json({ message: 'School not found' });
    }
    
    // Generate UID for dean (staff)
    const { generateStaffUID } = require('../utils/uidGenerator');
    const uid = await generateStaffUID();
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create dean user
    const dean = new User({
      name,
      email,
      password: hashedPassword,
      uid: uid,
      role: 'dean',
      roles: ['dean'],
      primaryRole: 'dean',
      school: schoolId,
      isActive: true,
      emailVerified: true
    });
    
    await dean.save();
    
    // Update school to reference this dean
    await School.findByIdAndUpdate(schoolId, { dean: dean._id });
    
    res.status(201).json({ 
      message: 'Dean created successfully', 
      dean: {
        _id: dean._id,
        name: dean.name,
        email: dean.email,
        uid: dean.uid,
        school: school.name
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDeans = async (req, res) => {
  try {
    const deans = await User.find({ role: 'dean' })
      .populate('school', 'name')
      .select('name email school isActive createdAt');
    
    res.json(deans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDean = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, schoolId, isActive } = req.body;
    
    // Find current dean
    const dean = await User.findById(id);
    if (!dean || dean.role !== 'dean') {
      return res.status(404).json({ message: 'Dean not found' });
    }
    
    // If school is changing, update old and new schools
    if (schoolId && schoolId !== dean.school?.toString()) {
      // Remove dean from old school
      if (dean.school) {
        await School.findByIdAndUpdate(dean.school, { $unset: { dean: 1 } });
      }
      
      // Verify new school exists
      const newSchool = await School.findById(schoolId);
      if (!newSchool) {
        return res.status(400).json({ message: 'New school not found' });
      }
      
      // Add dean to new school
      await School.findByIdAndUpdate(schoolId, { dean: id });
    }
    
    // Update dean
    const updatedDean = await User.findByIdAndUpdate(
      id,
      { name, email, school: schoolId, isActive },
      { new: true }
    ).populate('school', 'name');
    
    res.json({ 
      message: 'Dean updated successfully', 
      dean: updatedDean 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteDean = async (req, res) => {
  try {
    const { id } = req.params;
    
    const dean = await User.findById(id);
    if (!dean || dean.role !== 'dean') {
      return res.status(404).json({ message: 'Dean not found' });
    }
    
    // Remove dean reference from school
    if (dean.school) {
      await School.findByIdAndUpdate(dean.school, { $unset: { dean: 1 } });
    }
    
    // Delete dean
    await User.findByIdAndDelete(id);
    
    res.json({ message: 'Dean deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reset dean password
exports.resetDeanPassword = async (req, res) => {
  try {
    const { deanId, newPassword } = req.body;
    if (!deanId || !newPassword) {
      return res.status(400).json({ message: 'deanId and newPassword are required' });
    }
    const dean = await User.findById(deanId);
    if (!dean || dean.role !== 'dean') {
      return res.status(404).json({ message: 'Dean not found' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    dean.password = hashedPassword;
    await dean.save();
    await AuditLog.create({ action: 'reset_dean_password', performedBy: req.user._id, targetUser: deanId });
    res.json({ message: 'Dean password reset successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// HOD Management Functions
exports.createHOD = async (req, res) => {
  try {
    const { name, email, password, schoolId, departmentId } = req.body;
    
    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Verify department exists and belongs to the school
    const department = await Department.findById(departmentId).populate('school');
    if (!department) {
      return res.status(400).json({ message: 'Department not found' });
    }
    
    if (department.school._id.toString() !== schoolId) {
      return res.status(400).json({ message: 'Department does not belong to the selected school' });
    }
    
    // Generate UID for HOD (staff)
    const { generateStaffUID } = require('../utils/uidGenerator');
    const uid = await generateStaffUID();
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create HOD user
    const hod = new User({
      name,
      email,
      password: hashedPassword,
      uid: uid,
      role: 'hod',
      roles: ['hod'],
      primaryRole: 'hod',
      school: schoolId,
      department: departmentId,
      isActive: true,
      emailVerified: true
    });
    
    await hod.save();
    
    // Update department to reference this HOD
    await Department.findByIdAndUpdate(departmentId, { hod: hod._id });
    
    res.status(201).json({ 
      message: 'HOD created successfully', 
      hod: {
        _id: hod._id,
        name: hod.name,
        email: hod.email,
        uid: hod.uid,
        school: department.school.name,
        department: department.name
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllHODs = async (req, res) => {
  try {
    const hods = await User.find({ role: 'hod' })
      .populate('school', 'name')
      .populate('department', 'name')
      .select('name email school department isActive createdAt');
    
    res.json(hods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, schoolId, departmentId, isActive } = req.body;
    
    // Find current HOD
    const hod = await User.findById(id);
    if (!hod || hod.role !== 'hod') {
      return res.status(404).json({ message: 'HOD not found' });
    }
    
    // If department is changing, update old and new departments
    if (departmentId && departmentId !== hod.department?.toString()) {
      // Remove HOD from old department
      if (hod.department) {
        await Department.findByIdAndUpdate(hod.department, { $unset: { hod: 1 } });
      }
      
      // Verify new department exists and belongs to the school
      const newDepartment = await Department.findById(departmentId);
      if (!newDepartment) {
        return res.status(400).json({ message: 'New department not found' });
      }
      
      if (newDepartment.school.toString() !== schoolId) {
        return res.status(400).json({ message: 'Department does not belong to the selected school' });
      }
      
      // Add HOD to new department
      await Department.findByIdAndUpdate(departmentId, { hod: id });
    }
    
    // Update HOD
    const updatedHOD = await User.findByIdAndUpdate(
      id,
      { name, email, school: schoolId, department: departmentId, isActive },
      { new: true }
    ).populate('school', 'name').populate('department', 'name');
    
    res.json({ 
      message: 'HOD updated successfully', 
      hod: updatedHOD 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteHOD = async (req, res) => {
  try {
    const { id } = req.params;
    
    const hod = await User.findById(id);
    if (!hod || hod.role !== 'hod') {
      return res.status(404).json({ message: 'HOD not found' });
    }
    
    // Remove HOD reference from department
    if (hod.department) {
      await Department.findByIdAndUpdate(hod.department, { $unset: { hod: 1 } });
    }
    
    // Delete HOD
    await User.findByIdAndDelete(id);
    
    res.json({ message: 'HOD deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user's assigned sections and teaching assignments
exports.getUserAssignments = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user with populated assigned sections
    const user = await User.findById(userId)
      .populate({
        path: 'assignedSections',
        populate: [
          { path: 'school', select: 'name code' },
          { path: 'department', select: 'name code' },
          { path: 'courses', select: 'title courseCode' },
          { path: 'students', select: 'name email regNo' }
        ]
      })
      .select('name email role assignedSections');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get course-teacher assignments for this user
    const courseAssignments = await SectionCourseTeacher.find({
      teacher: userId,
      isActive: true
    }).populate([
      { path: 'section', select: 'name sectionCode' },
      { path: 'course', select: 'title courseCode' },
      { path: 'assignedBy', select: 'name email' }
    ]);

    // Get additional statistics
    let stats = {
      totalSections: user.assignedSections ? user.assignedSections.length : 0,
      totalStudents: 0,
      totalCourses: 0,
      activeCourseAssignments: courseAssignments.length
    };

    if (user.assignedSections) {
      // Calculate total students across all sections
      stats.totalStudents = user.assignedSections.reduce((total, section) => {
        return total + (section.students ? section.students.length : 0);
      }, 0);

      // Calculate unique courses across all sections
      const uniqueCourses = new Set();
      user.assignedSections.forEach(section => {
        if (section.courses) {
          section.courses.forEach(course => uniqueCourses.add(course._id.toString()));
        }
      });
      stats.totalCourses = uniqueCourses.size;
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      assignedSections: user.assignedSections || [],
      courseAssignments,
      stats
    });
  } catch (error) {
    console.error('Error getting user assignments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get user assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all sections for admin group chat
exports.getAllSections = async (req, res) => {
  try {
    const Section = require('../models/Section');
    
    const sections = await Section.find()
      .populate('students', 'name email')
      .populate('courses', 'title courseCode')
      .sort({ name: 1 });

    res.json(sections);
  } catch (error) {
    console.error('Error getting all sections:', error);
    res.status(500).json({ 
      message: 'Failed to get sections',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get courses for a specific section
exports.getSectionCourses = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const Section = require('../models/Section');
    
    const section = await Section.findById(sectionId)
      .populate('courses', 'title courseCode _id');

    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    res.json(section.courses || []);
  } catch (error) {
    console.error('Error getting section courses:', error);
    res.status(500).json({ 
      message: 'Failed to get section courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Admin-specific teacher-section-course assignment (bypasses HOD role requirement)
exports.adminAssignTeacherToSectionCourse = async (req, res) => {
  try {
    const { teacherId, sectionId, courseId } = req.body;

    // Validate inputs
    if (!teacherId || !sectionId || !courseId) {
      return res.status(400).json({ message: 'teacherId, sectionId, and courseId are required' });
    }

    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const User = require('../models/User');
    const Course = require('../models/Course');
    const Section = require('../models/Section');

    // Verify teacher exists and has teacher role
    const teacher = await User.findById(teacherId);
    const hasTeacherRole = teacher && (
      teacher.role === 'teacher' || 
      (teacher.roles && teacher.roles.includes('teacher'))
    );
    if (!teacher || !hasTeacherRole) {
      return res.status(403).json({ message: 'User must have teacher role' });
    }

    // Verify course and section exist
    const [course, section] = await Promise.all([
      Course.findById(courseId),
      Section.findById(sectionId)
    ]);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Check if assignment already exists
    const existingAssignment = await SectionCourseTeacher.findOne({
      section: sectionId,
      course: courseId,
      teacher: teacherId
    });

    if (existingAssignment) {
      return res.status(409).json({ message: 'Teacher is already assigned to this course in this section' });
    }

    // Create new assignment
    const assignment = new SectionCourseTeacher({
      section: sectionId,
      course: courseId,
      teacher: teacherId,
      assignedBy: req.user.id,
      assignedAt: new Date()
    });

    await assignment.save();

    // Update teacher's assigned sections
    if (!teacher.assignedSections.includes(sectionId)) {
      teacher.assignedSections.push(sectionId);
      await teacher.save();
    }

    res.status(201).json({
      success: true,
      message: 'Teacher assigned to course in section successfully',
      assignment: assignment
    });

  } catch (error) {
    console.error('Error in admin teacher assignment:', error);
    res.status(500).json({ 
      message: 'Failed to assign teacher to course in section',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Admin-specific teacher-section-course removal
exports.adminRemoveTeacherFromSectionCourse = async (req, res) => {
  try {
    const { teacherId, sectionId, courseId } = req.body;

    // Validate inputs
    if (!teacherId || !sectionId || !courseId) {
      return res.status(400).json({ message: 'teacherId, sectionId, and courseId are required' });
    }

    const SectionCourseTeacher = require('../models/SectionCourseTeacher');

    // Find and remove assignment
    const assignment = await SectionCourseTeacher.findOneAndDelete({
      section: sectionId,
      course: courseId,
      teacher: teacherId
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({
      success: true,
      message: 'Teacher removed from course in section successfully'
    });

  } catch (error) {
    console.error('Error in admin teacher removal:', error);
    res.status(500).json({ 
      message: 'Failed to remove teacher from course in section',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Bulk upload sections from CSV
exports.bulkUploadSections = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const csv = require('csv-parser');
  const fs = require('fs');
  const Section = require('../models/Section');
  const School = require('../models/School');
  const Department = require('../models/Department');

  const rows = [];
  const results = [];
  const errors = [];
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase(),
      skipEmptyLines: true
    }))
    .on('data', (row) => {
      const normalized = {};
      Object.keys(row).forEach(k => {
        normalized[k.toLowerCase().trim()] = row[k];
      });
      rows.push(normalized);
    })
    .on('end', async () => {
      try {
        console.log(`[bulkUploadSections] Processing ${rows.length} rows`);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2;

          try {
            const name = (row.name || '').trim();
            const schoolRaw = (row.school || '').trim();
            const departmentRaw = (row.department || '').trim();
            const semester = row.semester ? parseInt(row.semester) : undefined;
            const year = (row.year || '').trim();
            const capacity = row.capacity ? parseInt(row.capacity) : 60;

            // Validation
            if (!name) throw new Error('Missing section name');
            if (!schoolRaw) throw new Error('Missing school');
            if (!departmentRaw) throw new Error('Missing department');

            // Find school
            const school = await School.findOne({
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(schoolRaw) ? schoolRaw : null },
                { code: schoolRaw },
                { name: { $regex: new RegExp('^' + schoolRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
              ]
            });

            if (!school) throw new Error(`School '${schoolRaw}' not found`);

            // Find department
            const department = await Department.findOne({
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(departmentRaw) ? departmentRaw : null },
                { code: departmentRaw },
                { name: { $regex: new RegExp('^' + departmentRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
              ],
              school: school._id
            });

            if (!department) throw new Error(`Department '${departmentRaw}' not found in ${school.name}`);

            // Check if section already exists
            const existing = await Section.findOne({
              name: { $regex: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
              school: school._id,
              department: department._id
            });

            if (existing) {
              throw new Error(`Section '${name}' already exists in ${department.name}`);
            }

            // Create section
            const section = new Section({
              name,
              school: school._id,
              department: department._id,
              semester,
              year,
              capacity,
              isActive: true,
              students: [],
              teachers: [],
              courses: []
            });

            await section.save();

            results.push({
              row: rowNum,
              name,
              school: school.name,
              department: department.name,
              semester: semester || '-',
              year: year || '-',
              capacity
            });

            successCount++;

          } catch (err) {
            console.error(`Row ${rowNum} error:`, err.message);
            errors.push({ row: rowNum, message: err.message });
          }
        }

        // Cleanup uploaded file
        try { fs.unlinkSync(req.file.path); } catch (_) {}

        res.json({
          success: successCount,
          failed: errors.length,
          total: rows.length,
          results,
          errors
        });

      } catch (err) {
        console.error('Error in bulkUploadSections:', err);
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

// Bulk assign courses to sections from CSV
exports.bulkAssignCoursesToSections = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const csv = require('csv-parser');
  const fs = require('fs');
  const Section = require('../models/Section');
  const Course = require('../models/Course');
  const School = require('../models/School');
  const Department = require('../models/Department');

  const rows = [];
  const results = [];
  const errors = [];
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase(),
      skipEmptyLines: true
    }))
    .on('data', (row) => {
      const normalized = {};
      Object.keys(row).forEach(k => {
        normalized[k.toLowerCase().trim()] = row[k];
      });
      rows.push(normalized);
    })
    .on('end', async () => {
      try {
        console.log(`[bulkAssignCoursesToSections] Processing ${rows.length} rows`);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2;

          try {
            const sectionRaw = (row.section || '').trim();
            const schoolRaw = (row.school || '').trim();
            const departmentRaw = (row.department || '').trim();
            const coursesRaw = (row.courses || row.coursecodes || '').trim();

            // Validation
            if (!sectionRaw) throw new Error('Missing section');
            if (!coursesRaw) throw new Error('Missing courses');

            // Find school and department if provided
            let schoolId = null, departmentId = null;

            if (schoolRaw) {
              const school = await School.findOne({
                $or: [
                  { _id: mongoose.Types.ObjectId.isValid(schoolRaw) ? schoolRaw : null },
                  { code: schoolRaw },
                  { name: { $regex: new RegExp('^' + schoolRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
                ]
              });
              if (school) schoolId = school._id;
            }

            if (departmentRaw) {
              const department = await Department.findOne({
                $or: [
                  { _id: mongoose.Types.ObjectId.isValid(departmentRaw) ? departmentRaw : null },
                  { code: departmentRaw },
                  { name: { $regex: new RegExp('^' + departmentRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
                ],
                ...(schoolId && { school: schoolId })
              });
              if (department) departmentId = department._id;
            }

            // Find section
            const sectionQuery = {
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(sectionRaw) ? sectionRaw : null },
                { name: { $regex: new RegExp('^' + sectionRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
              ]
            };

            if (schoolId) sectionQuery.school = schoolId;
            if (departmentId) sectionQuery.department = departmentId;

            const section = await Section.findOne(sectionQuery);
            if (!section) throw new Error(`Section '${sectionRaw}' not found`);

            // Parse courses (comma/semicolon separated)
            const courseTokens = coursesRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
            if (courseTokens.length === 0) throw new Error('No valid courses provided');

            const courseIds = [];
            const notFound = [];

            for (const token of courseTokens) {
              const course = await Course.findOne({
                $or: [
                  { _id: mongoose.Types.ObjectId.isValid(token) ? token : null },
                  { code: token },
                  { title: { $regex: new RegExp('^' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
                ]
              });

              if (course) {
                if (!courseIds.includes(course._id.toString())) {
                  courseIds.push(course._id);
                }
              } else {
                notFound.push(token);
              }
            }

            if (courseIds.length === 0) {
              throw new Error(`No valid courses found from: ${coursesRaw}`);
            }

            // Add courses to section (avoid duplicates)
            const existingCourses = section.courses.map(c => c.toString());
            const newCourses = courseIds.filter(id => !existingCourses.includes(id.toString()));

            if (newCourses.length > 0) {
              section.courses.push(...newCourses);
              await section.save();
            }

            results.push({
              row: rowNum,
              section: section.name,
              coursesAdded: newCourses.length,
              coursesSkipped: courseIds.length - newCourses.length,
              notFound: notFound.length > 0 ? notFound.join(', ') : null
            });

            successCount++;

          } catch (err) {
            console.error(`Row ${rowNum} error:`, err.message);
            errors.push({ row: rowNum, message: err.message });
          }
        }

        // Cleanup uploaded file
        try { fs.unlinkSync(req.file.path); } catch (_) {}

        res.json({
          success: successCount,
          failed: errors.length,
          total: rows.length,
          results,
          errors
        });

      } catch (err) {
        console.error('Error in bulkAssignCoursesToSections:', err);
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

// Bulk assign teachers to section-courses from CSV
exports.bulkAssignTeachersToSections = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const csv = require('csv-parser');
  const fs = require('fs');
  const Section = require('../models/Section');
  const Course = require('../models/Course');
  const User = require('../models/User');
  const SectionCourseTeacher = require('../models/SectionCourseTeacher');

  const rows = [];
  const results = [];
  const errors = [];
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase(),
      skipEmptyLines: true
    }))
    .on('data', (row) => {
      const normalized = {};
      Object.keys(row).forEach(k => {
        normalized[k.toLowerCase().trim()] = row[k];
      });
      rows.push(normalized);
    })
    .on('end', async () => {
      try {
        console.log(`[bulkAssignTeachersToSections] Processing ${rows.length} rows`);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2;

          try {
            const sectionRaw = (row.section || '').trim();
            const courseRaw = (row.course || row.coursecode || '').trim();
            const teacherRaw = (row.teacher || row.teacheremail || row.teacheruid || '').trim();

            // Validation
            if (!sectionRaw) throw new Error('Missing section');
            if (!courseRaw) throw new Error('Missing course');
            if (!teacherRaw) throw new Error('Missing teacher');

            // Find section
            const section = await Section.findOne({
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(sectionRaw) ? sectionRaw : null },
                { name: { $regex: new RegExp('^' + sectionRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
              ]
            });

            if (!section) throw new Error(`Section '${sectionRaw}' not found`);

            // Find course
            const course = await Course.findOne({
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(courseRaw) ? courseRaw : null },
                { code: courseRaw },
                { title: { $regex: new RegExp('^' + courseRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
              ]
            });

            if (!course) throw new Error(`Course '${courseRaw}' not found`);

            // Check if course is assigned to section
            if (!section.courses.some(c => c.toString() === course._id.toString())) {
              throw new Error(`Course '${course.code}' is not assigned to section '${section.name}'`);
            }

            // Find teacher by email, UID, or teacherId
            const teacher = await User.findOne({
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(teacherRaw) ? teacherRaw : null },
                { email: teacherRaw.toLowerCase() },
                { uid: teacherRaw },
                { teacherId: teacherRaw }
              ],
              $or: [
                { role: 'teacher' },
                { roles: 'teacher' }
              ]
            });

            if (!teacher) throw new Error(`Teacher '${teacherRaw}' not found`);

            // Check if assignment already exists
            const existing = await SectionCourseTeacher.findOne({
              section: section._id,
              course: course._id,
              teacher: teacher._id
            });

            if (existing) {
              results.push({
                row: rowNum,
                section: section.name,
                course: course.code,
                teacher: teacher.email,
                status: 'Already assigned'
              });
              successCount++;
              continue;
            }

            // Create assignment
            const assignment = new SectionCourseTeacher({
              section: section._id,
              course: course._id,
              teacher: teacher._id,
              assignedBy: req.user._id,
              assignedAt: new Date()
            });

            await assignment.save();

            // Add teacher to section's teachers array if not already present
            if (!section.teachers.some(t => t.toString() === teacher._id.toString())) {
              section.teachers.push(teacher._id);
              await section.save();
            }

            results.push({
              row: rowNum,
              section: section.name,
              course: course.code,
              teacher: teacher.email,
              teacherUID: teacher.uid || teacher.teacherId,
              status: 'Assigned successfully'
            });

            successCount++;

          } catch (err) {
            console.error(`Row ${rowNum} error:`, err.message);
            errors.push({ row: rowNum, message: err.message });
          }
        }

        // Cleanup uploaded file
        try { fs.unlinkSync(req.file.path); } catch (_) {}

        res.json({
          success: successCount,
          failed: errors.length,
          total: rows.length,
          results,
          errors
        });

      } catch (err) {
        console.error('Error in bulkAssignTeachersToSections:', err);
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};