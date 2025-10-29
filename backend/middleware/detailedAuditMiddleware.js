const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

/**
 * Enhanced Detailed Audit Logging Middleware
 * Captures specific database changes, before/after values, and detailed operation context
 */

// Helper to get IP address
const getIpAddress = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'Unknown';
};

// Helper to parse user agent
const parseUserAgent = (userAgent) => {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  
  const browser = userAgent.includes('Chrome') ? 'Chrome' :
                 userAgent.includes('Firefox') ? 'Firefox' :
                 userAgent.includes('Safari') ? 'Safari' :
                 userAgent.includes('Edge') ? 'Edge' : 'Other';
  
  const os = userAgent.includes('Windows') ? 'Windows' :
            userAgent.includes('Mac') ? 'macOS' :
            userAgent.includes('Linux') ? 'Linux' :
            userAgent.includes('Android') ? 'Android' :
            userAgent.includes('iOS') ? 'iOS' : 'Other';
  
  const device = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';
  
  return { browser, os, device };
};

// Helper to generate detailed description with database changes
const generateDetailedDescription = async (action, userName, userRole, details = {}) => {
  let description = `${userName} (${userRole})`;
  
  switch (action) {
    // STUDENT OPERATIONS
    case 'CREATE_STUDENT':
      description += ` created new student: ${details.studentName || 'Unknown'} (${details.email || details.studentId || 'N/A'})`;
      if (details.school) description += ` in ${details.school}`;
      if (details.department) description += ` - ${details.department}`;
      if (details.section) description += ` - Section ${details.section}`;
      break;
      
    case 'UPDATE_STUDENT':
      description += ` updated student: ${details.studentName || details.studentId || 'Unknown'}`;
      if (details.changes && Object.keys(details.changes).length > 0) {
        const changedFields = Object.keys(details.changes).join(', ');
        description += ` | Changed fields: ${changedFields}`;
        
        // Add specific change details
        if (details.changes.name) {
          description += ` | Name: "${details.oldValues?.name}" → "${details.changes.name}"`;
        }
        if (details.changes.email) {
          description += ` | Email: "${details.oldValues?.email}" → "${details.changes.email}"`;
        }
        if (details.changes.section) {
          description += ` | Section: "${details.oldValues?.section}" → "${details.changes.section}"`;
        }
        if (details.changes.isActive !== undefined) {
          description += ` | Status: ${details.oldValues?.isActive ? 'Active' : 'Inactive'} → ${details.changes.isActive ? 'Active' : 'Inactive'}`;
        }
      }
      break;
      
    case 'DELETE_STUDENT':
      description += ` deleted student: ${details.studentName || details.studentId || 'Unknown'}`;
      if (details.email) description += ` (${details.email})`;
      if (details.section) description += ` from Section ${details.section}`;
      break;
      
    case 'BULK_UPLOAD_STUDENTS':
      description += ` performed bulk upload of students`;
      if (details.totalRows) description += ` | Total: ${details.totalRows} students`;
      if (details.successful) description += ` | Successful: ${details.successful}`;
      if (details.failed) description += ` | Failed: ${details.failed}`;
      if (details.fileName) description += ` | File: ${details.fileName}`;
      break;
      
    case 'ASSIGN_COURSES_TO_STUDENT':
      description += ` assigned courses to student: ${details.studentName || details.studentId}`;
      if (details.courses && Array.isArray(details.courses)) {
        description += ` | Courses: ${details.courses.join(', ')}`;
      }
      if (details.courseCount) description += ` | Total: ${details.courseCount} courses`;
      break;
    
    // TEACHER OPERATIONS
    case 'CREATE_TEACHER':
      description += ` created new teacher: ${details.teacherName || 'Unknown'} (${details.email || details.teacherId || 'N/A'})`;
      if (details.department) description += ` | Department: ${details.department}`;
      if (details.school) description += ` | School: ${details.school}`;
      break;
      
    case 'UPDATE_TEACHER':
      description += ` updated teacher: ${details.teacherName || details.teacherId}`;
      if (details.changes && Object.keys(details.changes).length > 0) {
        description += ` | Changed: ${Object.keys(details.changes).join(', ')}`;
      }
      break;
      
    case 'DELETE_TEACHER':
      description += ` deleted teacher: ${details.teacherName || details.teacherId}`;
      if (details.department) description += ` from ${details.department}`;
      break;
      
    case 'DEACTIVATE_TEACHER':
      description += ` deactivated teacher: ${details.teacherName || details.teacherId}`;
      if (details.reason) description += ` | Reason: ${details.reason}`;
      break;
      
    case 'BULK_UPLOAD_TEACHERS':
      description += ` performed bulk upload of teachers`;
      if (details.totalRows) description += ` | Total: ${details.totalRows}`;
      if (details.successful) description += ` | Success: ${details.successful}`;
      if (details.failed) description += ` | Failed: ${details.failed}`;
      break;
      
    case 'ASSIGN_TEACHER_TO_COURSE':
      description += ` assigned teacher ${details.teacherName || details.teacherId} to course: ${details.courseName || details.courseId}`;
      if (details.section) description += ` | Section: ${details.section}`;
      break;
      
    case 'REMOVE_TEACHER_FROM_COURSE':
      description += ` removed teacher ${details.teacherName || details.teacherId} from course: ${details.courseName || details.courseId}`;
      if (details.section) description += ` | Section: ${details.section}`;
      break;
    
    // COURSE OPERATIONS
    case 'CREATE_COURSE':
      description += ` created new course: ${details.courseName || details.courseCode || 'Unknown'}`;
      if (details.courseCode) description += ` (${details.courseCode})`;
      if (details.school) description += ` | School: ${details.school}`;
      if (details.department) description += ` | Department: ${details.department}`;
      if (details.credits) description += ` | Credits: ${details.credits}`;
      break;
      
    case 'UPDATE_COURSE':
      description += ` updated course: ${details.courseName || details.courseCode}`;
      if (details.changes && Object.keys(details.changes).length > 0) {
        const changedFields = Object.keys(details.changes).join(', ');
        description += ` | Changed: ${changedFields}`;
        
        if (details.changes.name) {
          description += ` | Name: "${details.oldValues?.name}" → "${details.changes.name}"`;
        }
        if (details.changes.credits) {
          description += ` | Credits: ${details.oldValues?.credits} → ${details.changes.credits}`;
        }
      }
      break;
      
    case 'DELETE_COURSE':
      description += ` deleted course: ${details.courseName || details.courseCode}`;
      if (details.studentsAffected) description += ` | Affected students: ${details.studentsAffected}`;
      break;
      
    case 'BULK_UPLOAD_COURSES':
      description += ` performed bulk upload of courses`;
      if (details.totalRows) description += ` | Total: ${details.totalRows}`;
      if (details.successful) description += ` | Success: ${details.successful}`;
      if (details.failed) description += ` | Failed: ${details.failed}`;
      break;
      
    case 'BULK_ASSIGN_COURSES':
      description += ` performed bulk course assignment`;
      if (details.studentsAffected) description += ` | Students: ${details.studentsAffected}`;
      if (details.coursesAssigned) description += ` | Courses: ${details.coursesAssigned}`;
      break;
    
    // ANNOUNCEMENT OPERATIONS
    case 'CREATE_ANNOUNCEMENT':
      description += ` created announcement: "${details.title || 'Untitled'}"`;
      if (details.targetRoles && Array.isArray(details.targetRoles)) {
        description += ` | Target: ${details.targetRoles.join(', ')}`;
      }
      if (details.recipientCount) description += ` | Recipients: ${details.recipientCount}`;
      if (details.priority) description += ` | Priority: ${details.priority}`;
      break;
      
    case 'UPDATE_ANNOUNCEMENT':
      description += ` updated announcement: "${details.title || details.announcementId}"`;
      if (details.changes) description += ` | Changed: ${Object.keys(details.changes).join(', ')}`;
      break;
      
    case 'DELETE_ANNOUNCEMENT':
      description += ` deleted announcement: "${details.title || details.announcementId}"`;
      break;
    
    // UNIT OPERATIONS
    case 'CREATE_UNIT':
      description += ` created unit: "${details.unitName || 'Unnamed'}" in course ${details.courseName || details.courseId}`;
      if (details.order) description += ` | Order: ${details.order}`;
      if (details.videosCount) description += ` | Videos: ${details.videosCount}`;
      break;
      
    case 'UPDATE_UNIT':
      description += ` updated unit: "${details.unitName || details.unitId}" in ${details.courseName || details.courseId}`;
      if (details.changes) {
        const changedFields = Object.keys(details.changes).join(', ');
        description += ` | Changed: ${changedFields}`;
      }
      break;
      
    case 'DELETE_UNIT':
      description += ` deleted unit: "${details.unitName || details.unitId}" from ${details.courseName || details.courseId}`;
      if (details.videosAffected) description += ` | Videos removed: ${details.videosAffected}`;
      break;
      
    case 'UPDATE_UNIT_DEADLINE':
      description += ` updated deadline for unit: "${details.unitName || details.unitId}"`;
      if (details.oldDeadline && details.newDeadline) {
        description += ` | From: ${details.oldDeadline} → To: ${details.newDeadline}`;
      }
      break;
    
    // VIDEO OPERATIONS
    case 'UPLOAD_VIDEO':
      description += ` uploaded video: "${details.videoTitle || 'Untitled'}"`;
      if (details.courseCode) description += ` to course ${details.courseCode}`;
      if (details.duration) description += ` | Duration: ${details.duration}`;
      if (details.fileSize) description += ` | Size: ${details.fileSize}`;
      break;
      
    case 'DELETE_VIDEO':
      description += ` deleted video: "${details.videoTitle || details.videoId}"`;
      if (details.courseCode) description += ` from course ${details.courseCode}`;
      break;
      
    case 'WARN_VIDEO':
      description += ` flagged video: "${details.videoTitle || details.videoId}" with warning`;
      if (details.reason) description += ` | Reason: ${details.reason}`;
      break;
    
    // QUIZ OPERATIONS
    case 'UPLOAD_QUIZ':
      description += ` uploaded quiz: "${details.quizTitle || 'Untitled'}"`;
      if (details.courseCode) description += ` for course ${details.courseCode}`;
      if (details.questionsCount) description += ` | Questions: ${details.questionsCount}`;
      if (details.totalMarks) description += ` | Total marks: ${details.totalMarks}`;
      break;
      
    case 'SUBMIT_QUIZ':
      description += ` submitted quiz: "${details.quizTitle || details.quizId}"`;
      if (details.score !== undefined) description += ` | Score: ${details.score}/${details.totalMarks || '?'}`;
      if (details.percentage) description += ` (${details.percentage}%)`;
      if (details.timeTaken) description += ` | Time: ${details.timeTaken}`;
      break;
      
    case 'CREATE_QUIZ_ATTEMPT':
      description += ` started quiz attempt: "${details.quizTitle || details.quizId}"`;
      if (details.attemptNumber) description += ` | Attempt #${details.attemptNumber}`;
      break;
    
    // SCHOOL/DEPARTMENT/SECTION OPERATIONS
    case 'CREATE_SCHOOL':
      description += ` created school: "${details.schoolName || details.schoolCode}"`;
      if (details.schoolCode) description += ` (${details.schoolCode})`;
      break;
      
    case 'UPDATE_SCHOOL':
      description += ` updated school: "${details.schoolName || details.schoolId}"`;
      if (details.changes) description += ` | Changed: ${Object.keys(details.changes).join(', ')}`;
      break;
      
    case 'DELETE_SCHOOL':
      description += ` deleted school: "${details.schoolName || details.schoolId}"`;
      if (details.departmentsAffected) description += ` | Departments affected: ${details.departmentsAffected}`;
      break;
      
    case 'CREATE_DEPARTMENT':
      description += ` created department: "${details.departmentName || details.departmentCode}"`;
      if (details.schoolName) description += ` in ${details.schoolName}`;
      break;
      
    case 'CREATE_SECTION':
      description += ` created section: "${details.sectionName || details.sectionCode}"`;
      if (details.departmentName) description += ` in ${details.departmentName}`;
      if (details.semester) description += ` | Semester: ${details.semester}`;
      break;
      
    case 'ASSIGN_STUDENTS_TO_SECTION':
      description += ` assigned students to section: ${details.sectionName || details.sectionId}`;
      if (details.studentsCount) description += ` | Students: ${details.studentsCount}`;
      break;
      
    case 'ASSIGN_COURSES_TO_SECTION':
      description += ` assigned courses to section: ${details.sectionName || details.sectionId}`;
      if (details.coursesCount) description += ` | Courses: ${details.coursesCount}`;
      if (details.courses) description += ` | ${details.courses.join(', ')}`;
      break;
    
    // DEAN/HOD OPERATIONS
    case 'CREATE_DEAN':
      description += ` created Dean: ${details.deanName || 'Unknown'} (${details.email || 'N/A'})`;
      if (details.schoolName) description += ` for ${details.schoolName}`;
      break;
      
    case 'UPDATE_DEAN':
      description += ` updated Dean: ${details.deanName || details.deanId}`;
      if (details.changes) description += ` | Changed: ${Object.keys(details.changes).join(', ')}`;
      break;
      
    case 'DELETE_DEAN':
      description += ` removed Dean: ${details.deanName || details.deanId}`;
      if (details.schoolName) description += ` from ${details.schoolName}`;
      break;
      
    case 'CREATE_HOD':
      description += ` created HOD: ${details.hodName || 'Unknown'} (${details.email || 'N/A'})`;
      if (details.departmentName) description += ` for ${details.departmentName}`;
      break;
      
    case 'UPDATE_HOD':
      description += ` updated HOD: ${details.hodName || details.hodId}`;
      if (details.changes) description += ` | Changed: ${Object.keys(details.changes).join(', ')}`;
      break;
      
    case 'DELETE_HOD':
      description += ` removed HOD: ${details.hodName || details.hodId}`;
      if (details.departmentName) description += ` from ${details.departmentName}`;
      break;
    
    // CERTIFICATE OPERATIONS
    case 'GENERATE_CERTIFICATE':
      description += ` generated certificate for student: ${details.studentName || details.studentId}`;
      if (details.courseName) description += ` | Course: ${details.courseName}`;
      if (details.grade) description += ` | Grade: ${details.grade}`;
      break;
      
    case 'DOWNLOAD_CERTIFICATE':
      description += ` downloaded certificate for ${details.courseName || details.courseId}`;
      break;
    
    // UNLOCK/PERMISSION OPERATIONS
    case 'UNLOCK_UNIT':
      description += ` unlocked unit "${details.unitName || details.unitId}" for student: ${details.studentName || details.studentId}`;
      if (details.courseName) description += ` | Course: ${details.courseName}`;
      if (details.reason) description += ` | Reason: ${details.reason}`;
      break;
      
    case 'GRANT_QUIZ_ATTEMPTS':
      description += ` granted ${details.attemptsGranted || '?'} quiz attempts to student: ${details.studentName || details.studentId}`;
      if (details.quizTitle) description += ` | Quiz: ${details.quizTitle}`;
      break;
      
    case 'RESET_PASSWORD':
      description += ` reset password for user: ${details.targetUserName || details.targetEmail || details.targetUserId}`;
      if (details.userType) description += ` | Type: ${details.userType}`;
      break;
    
    // BULK OPERATIONS
    case 'BULK_UPLOAD_SCHOOLS':
      description += ` performed bulk upload of schools`;
      if (details.totalRows) description += ` | Total: ${details.totalRows}`;
      if (details.successful) description += ` | Success: ${details.successful}`;
      if (details.failed) description += ` | Failed: ${details.failed}`;
      break;
      
    case 'BULK_UPLOAD_DEPARTMENTS':
      description += ` performed bulk upload of departments`;
      if (details.totalRows) description += ` | Total: ${details.totalRows}`;
      if (details.successful) description += ` | Success: ${details.successful}`;
      break;
      
    case 'BULK_UPLOAD_SECTIONS':
      description += ` performed bulk upload of sections`;
      if (details.totalRows) description += ` | Total: ${details.totalRows}`;
      if (details.successful) description += ` | Success: ${details.successful}`;
      break;
    
    // DATA EXPORT OPERATIONS
    case 'EXPORT_STUDENTS_DATA':
      description += ` exported students data`;
      if (details.totalRecords) description += ` | Records: ${details.totalRecords}`;
      if (details.filters) description += ` | Filters: ${details.filters}`;
      if (details.format) description += ` | Format: ${details.format}`;
      break;
      
    case 'EXPORT_ANALYTICS':
      description += ` exported analytics report`;
      if (details.reportType) description += ` | Type: ${details.reportType}`;
      if (details.dateRange) description += ` | Period: ${details.dateRange}`;
      break;
    
    // SETTINGS OPERATIONS
    case 'UPDATE_SETTINGS':
      description += ` updated system settings`;
      if (details.settingType) description += ` | Category: ${details.settingType}`;
      if (details.changes) {
        const changedSettings = Object.keys(details.changes).join(', ');
        description += ` | Changed: ${changedSettings}`;
      }
      break;
      
    case 'CHANGE_PASSWORD':
      description += ` changed their own password`;
      break;
    
    // DEFAULT
    default:
      description += ` performed action: ${action}`;
      if (details.resourceName) description += ` on ${details.resourceName}`;
  }
  
  return description;
};

/**
 * Middleware to log detailed operation with DB changes
 * Usage: Add before controller function
 */
const logDetailedOperation = (actionType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const startTime = Date.now();
    const originalJson = res.json.bind(res);
    let responseData = null;
    let operationDetails = {};
    
    // Override res.json to capture response
    res.json = function(data) {
      responseData = data;
      return originalJson(data);
    };
    
    // Store original method for logging after operation
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const status = statusCode >= 200 && statusCode < 300 ? 'success' : 
                       statusCode >= 400 && statusCode < 500 ? 'failure' : 'error';
        
        // Only log successful operations for detailed tracking
        if (status !== 'success') return;
        
        const userName = req.user.name || 'Unknown User';
        const userRole = req.user.role || req.user.roles?.[0] || 'User';
        
        // Extract operation-specific details from request body and params
        switch (actionType) {
          case 'CREATE_STUDENT':
            operationDetails = {
              studentName: req.body.name,
              email: req.body.email,
              studentId: req.body.studentId,
              school: req.body.school,
              department: req.body.department,
              section: req.body.section
            };
            break;
            
          case 'UPDATE_STUDENT':
            operationDetails = {
              studentId: req.params.id,
              changes: req.body,
              studentName: req.body.name
            };
            break;
            
          case 'DELETE_STUDENT':
            operationDetails = {
              studentId: req.params.id
            };
            break;
            
          case 'BULK_UPLOAD_STUDENTS':
            operationDetails = {
              fileName: req.file?.originalname,
              totalRows: responseData?.total || responseData?.uploaded,
              successful: responseData?.successful || responseData?.uploaded,
              failed: responseData?.failed || responseData?.errors?.length || 0
            };
            break;
            
          case 'CREATE_COURSE':
            operationDetails = {
              courseName: req.body.name,
              courseCode: req.body.courseCode,
              school: req.body.school,
              department: req.body.department,
              credits: req.body.credits
            };
            break;
            
          case 'UPDATE_COURSE':
            operationDetails = {
              courseId: req.params.id,
              courseName: req.body.name,
              courseCode: req.body.courseCode,
              changes: req.body
            };
            break;
            
          case 'CREATE_ANNOUNCEMENT':
            operationDetails = {
              title: req.body.title,
              targetRoles: req.body.targetAudience?.targetRoles || req.body.recipients,
              recipientCount: responseData?.recipientCount,
              priority: req.body.priority
            };
            break;
            
          case 'UPLOAD_VIDEO':
            operationDetails = {
              videoTitle: req.body.title,
              courseCode: req.body.courseCode,
              fileSize: req.file?.size ? `${(req.file.size / 1024 / 1024).toFixed(2)} MB` : undefined,
              duration: req.body.duration
            };
            break;
            
          case 'UPLOAD_QUIZ':
            operationDetails = {
              quizTitle: req.body.title || responseData?.quiz?.title,
              courseCode: req.body.courseCode,
              questionsCount: responseData?.questionsCount || responseData?.quiz?.questions?.length,
              totalMarks: responseData?.quiz?.totalMarks
            };
            break;
            
          case 'SUBMIT_QUIZ':
            operationDetails = {
              quizId: req.params.quizId || req.params.attemptId,
              score: responseData?.score,
              totalMarks: responseData?.totalMarks,
              percentage: responseData?.percentage,
              timeTaken: responseData?.timeTaken
            };
            break;
            
          case 'CREATE_TEACHER':
            operationDetails = {
              teacherName: req.body.name,
              email: req.body.email,
              teacherId: req.body.teacherId,
              department: req.body.department,
              school: req.body.school
            };
            break;
            
          case 'EXPORT_STUDENTS_DATA':
            operationDetails = {
              totalRecords: responseData?.count || responseData?.length,
              filters: req.query,
              format: 'CSV'
            };
            break;
            
          default:
            operationDetails = {
              resourceId: req.params.id,
              resourceName: req.body.name || req.body.title
            };
        }
        
        // Generate comprehensive description
        const description = await generateDetailedDescription(
          actionType,
          userName,
          userRole,
          operationDetails
        );
        
        // Create detailed audit log
        const logData = {
          action: actionType,
          description: description,
          actionType: actionType.split('_')[0].toLowerCase(),
          performedBy: req.user._id,
          performedByRole: userRole,
          performedByName: userName,
          performedByEmail: req.user.email,
          ipAddress: getIpAddress(req),
          userAgent: req.headers['user-agent'] || 'Unknown',
          deviceInfo: parseUserAgent(req.headers['user-agent']),
          requestMethod: req.method,
          requestUrl: req.originalUrl,
          requestBody: sanitizeBody(req.body),
          status: status,
          statusCode: statusCode,
          severity: 'medium',
          category: getCategoryFromAction(actionType),
          duration: duration,
          details: {
            ...operationDetails,
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            statusCode: statusCode,
            duration: `${duration}ms`
          },
          timestamp: new Date()
        };
        
        // Save to database (fire and forget)
        AuditLog.create(logData).catch(err => {
          console.error('Error creating detailed audit log:', err.message);
        });
        
      } catch (error) {
        console.error('Detailed audit middleware error:', error.message);
      }
    });
    
    next();
  };
};

// Helper to sanitize request body (remove sensitive data)
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'token', 'accessToken', 'refreshToken'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Helper to categorize actions
const getCategoryFromAction = (action) => {
  if (action.includes('STUDENT')) return 'student_management';
  if (action.includes('TEACHER')) return 'teacher_management';
  if (action.includes('COURSE')) return 'course_management';
  if (action.includes('QUIZ')) return 'assessment';
  if (action.includes('VIDEO')) return 'content_management';
  if (action.includes('ANNOUNCEMENT')) return 'communication';
  if (action.includes('DEAN') || action.includes('HOD')) return 'administration';
  if (action.includes('SCHOOL') || action.includes('DEPARTMENT') || action.includes('SECTION')) return 'organization';
  if (action.includes('EXPORT')) return 'data_export';
  if (action.includes('BULK')) return 'bulk_operations';
  if (action.includes('UNLOCK') || action.includes('GRANT')) return 'permissions';
  if (action.includes('CERTIFICATE')) return 'certification';
  if (action.includes('SETTINGS')) return 'system_settings';
  return 'general';
};

module.exports = {
  logDetailedOperation,
  generateDetailedDescription,
  getIpAddress,
  parseUserAgent
};
