const AuditLog = require('../models/AuditLog');

/**
 * ULTRA-COMPREHENSIVE AUDIT LOGGING MIDDLEWARE
 * Tracks every single user action, database change, and system interaction
 */

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract real IP address from various sources
 */
const getIpAddress = (req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             req.headers['x-client-ip'] ||
             req.headers['cf-connecting-ip'] ||
             req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             req.ip ||
             'Unknown';
  
  // Clean up IPv6 localhost
  return ip.replace('::ffff:', '').replace('::1', 'localhost');
};

/**
 * Parse User Agent for detailed device/browser info
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  
  const ua = userAgent.toLowerCase();
  
  // Detect Browser
  let browser = 'Unknown';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('opera/') || ua.includes('opr/')) browser = 'Opera';
  else if (ua.includes('msie') || ua.includes('trident/')) browser = 'Internet Explorer';
  
  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows nt 10.0')) os = 'Windows 10';
  else if (ua.includes('windows nt 11.0')) os = 'Windows 11';
  else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
  else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
  else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('ubuntu')) os = 'Ubuntu';
  
  // Detect Device Type
  let device = 'Desktop';
  if (ua.includes('mobile')) device = 'Mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';
  
  return { browser, os, device };
};

/**
 * Sanitize request body - remove sensitive data but keep everything else
 */
const sanitizeBody = (body) => {
  if (!body) return null;
  if (typeof body !== 'object') return body;
  
  const sanitized = JSON.parse(JSON.stringify(body)); // Deep clone
  
  const sensitiveFields = [
    'password', 'newPassword', 'oldPassword', 'confirmPassword',
    'token', 'accessToken', 'refreshToken', 'secret', 'apiKey',
    'creditCard', 'cvv', 'ssn'
  ];
  
  const redactSensitiveData = (obj) => {
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redactSensitiveData(obj[key]);
      }
    }
  };
  
  redactSensitiveData(sanitized);
  return sanitized;
};

/**
 * Extract entity ID from URL
 */
const extractEntityId = (url) => {
  const match = url.match(/\/([a-f0-9]{24})/i);
  return match ? match[1] : null;
};

/**
 * Determine entity type from URL
 */
const getEntityType = (url) => {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('/student')) return 'Student';
  if (urlLower.includes('/teacher')) return 'Teacher';
  if (urlLower.includes('/course')) return 'Course';
  if (urlLower.includes('/quiz')) return 'Quiz';
  if (urlLower.includes('/video')) return 'Video';
  if (urlLower.includes('/unit')) return 'Unit';
  if (urlLower.includes('/assignment')) return 'Assignment';
  if (urlLower.includes('/announcement')) return 'Announcement';
  if (urlLower.includes('/certificate')) return 'Certificate';
  if (urlLower.includes('/school')) return 'School';
  if (urlLower.includes('/department')) return 'Department';
  if (urlLower.includes('/section')) return 'Section';
  if (urlLower.includes('/dean')) return 'Dean';
  if (urlLower.includes('/hod')) return 'HOD';
  if (urlLower.includes('/notification')) return 'Notification';
  if (urlLower.includes('/chat')) return 'Chat';
  if (urlLower.includes('/live-class')) return 'LiveClass';
  
  return null;
};

/**
 * Generate ULTRA-DETAILED description based on request
 */
const generateDetailedDescription = (req, res, responseData) => {
  const url = req.originalUrl;
  const urlLower = url.toLowerCase();
  const method = req.method;
  const user = req.user;
  const userName = user?.name || 'Unknown User';
  const userRole = user?.role || user?.roles?.[0] || 'User';
  const statusCode = res.statusCode;
  const body = req.body;
  const query = req.query;
  const params = req.params;
  
  let description = '';
  let details = {};
  
  // ==================== AUTHENTICATION ====================
  if (urlLower.includes('/auth/login')) {
    description = `${userName} (${userRole}) logged into the system from ${parseUserAgent(req.headers['user-agent']).browser} on ${parseUserAgent(req.headers['user-agent']).os}`;
    details = {
      loginMethod: body.loginMethod || 'email',
      email: body.email,
      timestamp: new Date().toISOString()
    };
  }
  else if (urlLower.includes('/auth/logout')) {
    description = `${userName} (${userRole}) logged out from the system`;
  }
  else if (urlLower.includes('/auth/register')) {
    description = `New user registration attempt for email: ${body.email}`;
  }
  else if (urlLower.includes('/auth/forgot-password')) {
    description = `Password reset requested for email: ${body.email}`;
  }
  else if (urlLower.includes('/auth/reset-password')) {
    description = `Password was reset for user`;
  }
  
  // ==================== STUDENT MANAGEMENT ====================
  else if (urlLower.includes('/students') && method === 'GET' && !urlLower.includes('/api/students/')) {
    const filters = [];
    if (query.search) filters.push(`search: "${query.search}"`);
    if (query.school) filters.push(`school filter applied`);
    if (query.department) filters.push(`department filter applied`);
    if (query.section) filters.push(`section filter applied`);
    if (query.year) filters.push(`year: ${query.year}`);
    
    description = `${userName} (${userRole}) viewed Students List page`;
    if (filters.length > 0) {
      description += ` with filters: ${filters.join(', ')}`;
    }
    details = {
      totalStudents: responseData?.total || 0,
      displayedStudents: responseData?.students?.length || 0,
      filters: query,
      page: query.page || 1,
      limit: query.limit || 10
    };
  }
  else if (urlLower.includes('/student/') && method === 'GET') {
    const studentId = extractEntityId(url);
    description = `${userName} (${userRole}) viewed detailed profile of student`;
    details = {
      studentId,
      sections: ['personal info', 'courses', 'attendance', 'grades', 'certificates']
    };
  }
  else if (urlLower.includes('/student') && method === 'POST') {
    description = `${userName} (${userRole}) created new student record: ${body.name} (${body.email})`;
    details = {
      studentName: body.name,
      studentEmail: body.email,
      studentId: body.studentId,
      school: body.school,
      department: body.department,
      section: body.section,
      enrollmentYear: body.enrollmentYear,
      createdFields: Object.keys(body)
    };
  }
  else if (urlLower.includes('/student') && method === 'PUT') {
    const studentId = extractEntityId(url);
    const changedFields = Object.keys(body);
    description = `${userName} (${userRole}) updated student record`;
    details = {
      studentId,
      modifiedFields: changedFields,
      changes: body
    };
    
    if (changedFields.length > 0) {
      description += ` - Modified: ${changedFields.join(', ')}`;
    }
  }
  else if (urlLower.includes('/student') && method === 'DELETE') {
    const studentId = extractEntityId(url);
    description = `${userName} (${userRole}) DELETED student record`;
    details = {
      studentId,
      deletionReason: body.reason,
      permanentDeletion: true
    };
  }
  
  // ==================== TEACHER MANAGEMENT ====================
  else if (urlLower.includes('/teachers') && method === 'GET') {
    const filters = [];
    if (query.search) filters.push(`search: "${query.search}"`);
    if (query.school) filters.push(`school filter`);
    if (query.department) filters.push(`department filter`);
    
    description = `${userName} (${userRole}) viewed Teachers List page`;
    if (filters.length > 0) {
      description += ` with filters: ${filters.join(', ')}`;
    }
    details = {
      totalTeachers: responseData?.total || 0,
      filters: query
    };
  }
  else if (urlLower.includes('/teacher/') && method === 'GET') {
    description = `${userName} (${userRole}) viewed teacher profile details`;
  }
  else if (urlLower.includes('/teacher') && method === 'POST') {
    description = `${userName} (${userRole}) created new teacher account: ${body.name} (${body.email})`;
    details = {
      teacherName: body.name,
      teacherEmail: body.email,
      teacherId: body.teacherId,
      school: body.school,
      department: body.department,
      subjects: body.subjects
    };
  }
  else if (urlLower.includes('/teacher') && method === 'PUT') {
    const changedFields = Object.keys(body);
    description = `${userName} (${userRole}) updated teacher information`;
    if (changedFields.length > 0) {
      description += ` - Modified: ${changedFields.join(', ')}`;
    }
    details = {
      modifiedFields: changedFields,
      changes: body
    };
  }
  else if (urlLower.includes('/teacher') && method === 'DELETE') {
    description = `${userName} (${userRole}) DELETED teacher account`;
    details = { deletionReason: body.reason };
  }
  
  // ==================== COURSE MANAGEMENT ====================
  else if (urlLower.includes('/courses') && method === 'GET') {
    const filters = [];
    if (query.search) filters.push(`search: "${query.search}"`);
    if (query.school) filters.push(`school filter`);
    if (query.department) filters.push(`department filter`);
    if (query.teacher) filters.push(`teacher filter`);
    
    description = `${userName} (${userRole}) viewed Courses List page`;
    if (filters.length > 0) {
      description += ` with filters: ${filters.join(', ')}`;
    }
    details = {
      totalCourses: responseData?.total || 0,
      filters: query
    };
  }
  else if (urlLower.includes('/course/') && urlLower.includes('/details')) {
    description = `${userName} (${userRole}) viewed course details page`;
    details = {
      courseId: extractEntityId(url),
      sectionsViewed: ['overview', 'units', 'students', 'analytics']
    };
  }
  else if (urlLower.includes('/course') && method === 'POST') {
    description = `${userName} (${userRole}) created new course: ${body.courseName || body.name}`;
    details = {
      courseName: body.courseName || body.name,
      courseCode: body.courseCode,
      school: body.school,
      department: body.department,
      credits: body.credits,
      semester: body.semester,
      assignedTeacher: body.teacherId
    };
  }
  else if (urlLower.includes('/course') && method === 'PUT') {
    const changedFields = Object.keys(body);
    description = `${userName} (${userRole}) updated course details`;
    if (changedFields.length > 0) {
      description += ` - Modified: ${changedFields.join(', ')}`;
    }
    details = {
      courseId: extractEntityId(url),
      modifiedFields: changedFields,
      changes: body
    };
  }
  else if (urlLower.includes('/course') && method === 'DELETE') {
    description = `${userName} (${userRole}) DELETED course`;
    details = {
      courseId: extractEntityId(url),
      deletionReason: body.reason
    };
  }
  
  // ==================== QUIZ MANAGEMENT ====================
  else if (urlLower.includes('/quiz') && method === 'POST' && !urlLower.includes('/submit') && !urlLower.includes('/attempt')) {
    description = `${userName} (${userRole}) created new quiz: ${body.title}`;
    details = {
      quizTitle: body.title,
      courseId: body.courseId,
      unitId: body.unitId,
      totalQuestions: body.questions?.length || 0,
      totalMarks: body.totalMarks,
      duration: body.duration,
      passingMarks: body.passingMarks,
      maxAttempts: body.maxAttempts
    };
  }
  else if (urlLower.includes('/quiz/') && urlLower.includes('/attempt') && method === 'POST') {
    description = `${userName} (${userRole}) started quiz attempt`;
    details = {
      quizId: extractEntityId(url),
      attemptNumber: body.attemptNumber || 1
    };
  }
  else if (urlLower.includes('/quiz/') && urlLower.includes('/submit')) {
    description = `${userName} (${userRole}) submitted quiz answers`;
    details = {
      quizId: extractEntityId(url),
      answeredQuestions: body.answers?.length || 0,
      timeTaken: body.timeTaken,
      score: responseData?.score,
      percentage: responseData?.percentage,
      passed: responseData?.passed
    };
  }
  else if (urlLower.includes('/quiz') && method === 'PUT') {
    description = `${userName} (${userRole}) updated quiz configuration`;
    details = {
      quizId: extractEntityId(url),
      modifiedFields: Object.keys(body)
    };
  }
  else if (urlLower.includes('/unlock-quiz')) {
    description = `${userName} (${userRole}) unlocked quiz for student`;
    details = {
      quizId: body.quizId,
      studentId: body.studentId,
      reason: body.reason
    };
  }
  
  // ==================== VIDEO MANAGEMENT ====================
  else if (urlLower.includes('/video') && method === 'POST') {
    description = `${userName} (${userRole}) uploaded new video: ${body.title}`;
    details = {
      videoTitle: body.title,
      videoUrl: body.videoUrl,
      duration: body.duration,
      courseId: body.courseId,
      unitId: body.unitId
    };
  }
  else if (urlLower.includes('/video/') && urlLower.includes('/watch')) {
    description = `${userName} (${userRole}) is watching video`;
    details = {
      videoId: extractEntityId(url),
      watchProgress: body.progress,
      timestamp: body.currentTime
    };
  }
  
  // ==================== ANALYTICS ====================
  else if (urlLower.includes('/analytics')) {
    let analyticsType = 'General';
    if (urlLower.includes('student')) analyticsType = 'Student';
    if (urlLower.includes('course')) analyticsType = 'Course';
    if (urlLower.includes('teacher')) analyticsType = 'Teacher';
    if (urlLower.includes('department')) analyticsType = 'Department';
    if (urlLower.includes('school')) analyticsType = 'School';
    
    description = `${userName} (${userRole}) viewed ${analyticsType} Analytics dashboard`;
    details = {
      analyticsType,
      dateRange: query.dateRange,
      filters: query,
      metricsViewed: ['performance', 'attendance', 'engagement']
    };
  }
  
  // ==================== BULK OPERATIONS ====================
  else if (urlLower.includes('/bulk-upload')) {
    const uploadType = urlLower.includes('student') ? 'Students' :
                      urlLower.includes('teacher') ? 'Teachers' :
                      urlLower.includes('course') ? 'Courses' : 'Data';
    
    description = `${userName} (${userRole}) performed BULK UPLOAD of ${uploadType}`;
    details = {
      uploadType,
      fileName: body.fileName,
      totalRecords: body.totalRecords || responseData?.total,
      successfulRecords: responseData?.success,
      failedRecords: responseData?.failed,
      errors: responseData?.errors
    };
  }
  else if (urlLower.includes('/bulk-assign')) {
    description = `${userName} (${userRole}) performed BULK ASSIGNMENT operation`;
    details = {
      assignmentType: body.type,
      totalAssignments: body.assignments?.length,
      targetEntities: body.targetIds
    };
  }
  
  // ==================== EXPORT OPERATIONS ====================
  else if (urlLower.includes('/export')) {
    const exportType = urlLower.includes('student') ? 'Student Data' :
                      urlLower.includes('course') ? 'Course Data' :
                      urlLower.includes('analytics') ? 'Analytics Report' :
                      urlLower.includes('attendance') ? 'Attendance Records' :
                      urlLower.includes('grades') ? 'Grade Report' : 'Data';
    
    description = `${userName} (${userRole}) EXPORTED ${exportType}`;
    details = {
      exportType,
      format: query.format || 'CSV',
      recordsExported: responseData?.count,
      filters: query,
      fileName: responseData?.fileName
    };
  }
  
  // ==================== CERTIFICATES ====================
  else if (urlLower.includes('/certificate/') && urlLower.includes('/generate')) {
    description = `${userName} (${userRole}) generated certificate`;
    details = {
      certificateType: body.type,
      studentId: body.studentId,
      courseId: body.courseId
    };
  }
  else if (urlLower.includes('/certificate/') && urlLower.includes('/download')) {
    description = `${userName} (${userRole}) downloaded certificate`;
    details = {
      certificateId: extractEntityId(url)
    };
  }
  
  // ==================== ANNOUNCEMENTS ====================
  else if (urlLower.includes('/announcement') && method === 'POST') {
    description = `${userName} (${userRole}) created announcement: "${body.title}"`;
    details = {
      title: body.title,
      message: body.message?.substring(0, 100),
      targetRoles: body.targetAudience?.targetRoles || body.recipients,
      priority: body.priority,
      expiryDate: body.expiryDate
    };
  }
  
  // ==================== ASSIGNMENTS ====================
  else if (urlLower.includes('/assignment/') && urlLower.includes('/submit')) {
    description = `${userName} (${userRole}) submitted assignment`;
    details = {
      assignmentId: extractEntityId(url),
      submissionFile: body.fileName,
      submittedAt: new Date().toISOString()
    };
  }
  else if (urlLower.includes('/assignment/') && urlLower.includes('/grade')) {
    description = `${userName} (${userRole}) graded assignment submission`;
    details = {
      assignmentId: extractEntityId(url),
      studentId: body.studentId,
      score: body.score,
      maxScore: body.maxScore,
      feedback: body.feedback
    };
  }
  
  // ==================== NOTIFICATIONS ====================
  else if (urlLower.includes('/notifications') && method === 'GET') {
    description = `${userName} (${userRole}) checked notifications`;
    details = {
      unreadCount: responseData?.unread || 0,
      totalCount: responseData?.total || 0
    };
  }
  else if (urlLower.includes('/notification/') && urlLower.includes('/read')) {
    description = `${userName} (${userRole}) marked notification as read`;
  }
  
  // ==================== CHAT ====================
  else if (urlLower.includes('/chat') || urlLower.includes('/message')) {
    if (method === 'POST') {
      description = `${userName} (${userRole}) sent chat message`;
      details = {
        messageLength: body.message?.length,
        recipient: body.recipientId,
        chatType: body.chatType || 'private'
      };
    } else {
      description = `${userName} (${userRole}) viewed chat messages`;
    }
  }
  
  // ==================== LIVE CLASSES ====================
  else if (urlLower.includes('/live-class/') && urlLower.includes('/join')) {
    description = `${userName} (${userRole}) JOINED live class session`;
    details = {
      classId: extractEntityId(url),
      joinedAt: new Date().toISOString()
    };
  }
  else if (urlLower.includes('/live-class/') && urlLower.includes('/leave')) {
    description = `${userName} (${userRole}) LEFT live class session`;
    details = {
      classId: extractEntityId(url),
      duration: body.duration
    };
  }
  else if (urlLower.includes('/live-class') && method === 'POST') {
    description = `${userName} (${userRole}) created new live class: ${body.title}`;
    details = {
      title: body.title,
      courseId: body.courseId,
      scheduledAt: body.scheduledAt,
      duration: body.duration
    };
  }
  
  // ==================== SCHOOLS & DEPARTMENTS ====================
  else if (urlLower.includes('/school') && method === 'POST') {
    description = `${userName} (${userRole}) created new school: ${body.name}`;
    details = {
      schoolName: body.name,
      schoolCode: body.code
    };
  }
  else if (urlLower.includes('/school') && method === 'PUT') {
    description = `${userName} (${userRole}) updated school details`;
    details = {
      modifiedFields: Object.keys(body)
    };
  }
  else if (urlLower.includes('/department') && method === 'POST') {
    description = `${userName} (${userRole}) created new department: ${body.name}`;
    details = {
      departmentName: body.name,
      departmentCode: body.code,
      school: body.schoolId
    };
  }
  else if (urlLower.includes('/department') && method === 'PUT') {
    description = `${userName} (${userRole}) updated department details`;
    details = {
      modifiedFields: Object.keys(body)
    };
  }
  
  // ==================== SETTINGS ====================
  else if (urlLower.includes('/settings')) {
    description = `${userName} (${userRole}) modified system settings`;
    details = {
      settingsChanged: Object.keys(body),
      changes: body
    };
  }
  else if (urlLower.includes('/profile') && method === 'PUT') {
    description = `${userName} (${userRole}) updated their profile`;
    details = {
      modifiedFields: Object.keys(body)
    };
  }
  
  // ==================== DASHBOARD VISITS ====================
  else if (urlLower.includes('/dashboard')) {
    const dashboardType = urlLower.includes('admin') ? 'Admin' :
                         urlLower.includes('dean') ? 'Dean' :
                         urlLower.includes('hod') ? 'HOD' :
                         urlLower.includes('teacher') ? 'Teacher' :
                         urlLower.includes('student') ? 'Student' : 'Main';
    
    description = `${userName} (${userRole}) visited ${dashboardType} Dashboard`;
    details = {
      dashboardType,
      widgetsLoaded: ['statistics', 'recent_activity', 'notifications']
    };
  }
  
  // ==================== SEARCH OPERATIONS ====================
  else if (query.search && method === 'GET') {
    description = `${userName} (${userRole}) performed search query: "${query.search}"`;
    details = {
      searchQuery: query.search,
      searchIn: getEntityType(url) || 'general',
      resultsCount: responseData?.total || 0,
      filters: query
    };
  }
  
  // ==================== GENERIC API CALLS ====================
  else {
    const urlParts = url.split('?')[0].split('/').filter(Boolean);
    const resource = urlParts[urlParts.length - 1] || 'resource';
    const action = method === 'GET' ? 'viewed' :
                  method === 'POST' ? 'created' :
                  method === 'PUT' ? 'updated' :
                  method === 'DELETE' ? 'deleted' : 'accessed';
    
    description = `${userName} (${userRole}) ${action} ${resource}`;
    details = {
      endpoint: url,
      method: method,
      hasQueryParams: Object.keys(query).length > 0,
      hasBodyData: Object.keys(body || {}).length > 0
    };
  }
  
  // Add status information
  const statusText = statusCode >= 200 && statusCode < 300 ? ' successfully' :
                    statusCode >= 400 && statusCode < 500 ? ' (FAILED - Client Error)' :
                    statusCode >= 500 ? ' (FAILED - Server Error)' : '';
  
  description += statusText;
  
  return { description, details };
};

/**
 * Get severity level based on action
 */
const getSeverity = (method, statusCode, url) => {
  const urlLower = url.toLowerCase();
  
  // Critical operations
  if (method === 'DELETE') return 'critical';
  if (urlLower.includes('/bulk-upload')) return 'high';
  if (urlLower.includes('/bulk-delete')) return 'critical';
  if (urlLower.includes('/export')) return 'medium';
  if (statusCode >= 500) return 'critical';
  if (statusCode >= 400) return 'high';
  if (statusCode === 401 || statusCode === 403) return 'high';
  
  // High priority operations
  if (method === 'POST') return 'medium';
  if (method === 'PUT') return 'medium';
  
  // Normal operations
  return 'info';
};

/**
 * Determine category
 */
const getCategory = (url) => {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('/auth')) return 'authentication';
  if (urlLower.includes('/student')) return 'student_management';
  if (urlLower.includes('/teacher')) return 'teacher_management';
  if (urlLower.includes('/course')) return 'course_management';
  if (urlLower.includes('/quiz')) return 'assessment';
  if (urlLower.includes('/assignment')) return 'assessment';
  if (urlLower.includes('/video')) return 'content_management';
  if (urlLower.includes('/analytics')) return 'analytics';
  if (urlLower.includes('/bulk')) return 'bulk_operations';
  if (urlLower.includes('/export')) return 'data_export';
  if (urlLower.includes('/certificate')) return 'certification';
  if (urlLower.includes('/announcement')) return 'communication';
  if (urlLower.includes('/chat') || urlLower.includes('/message')) return 'communication';
  if (urlLower.includes('/live-class')) return 'live_session';
  if (urlLower.includes('/admin')) return 'administration';
  if (urlLower.includes('/dean')) return 'administration';
  if (urlLower.includes('/hod')) return 'administration';
  if (urlLower.includes('/school') || urlLower.includes('/department')) return 'organization';
  
  return 'other';
};

// ==================== MAIN MIDDLEWARE ====================

/**
 * Comprehensive Audit Logging Middleware
 * Logs EVERY authenticated request with maximum detail
 */
const comprehensiveAuditLogger = async (req, res, next) => {
  // Skip certain routes to avoid noise
  const skipRoutes = [
    '/api/health',
    '/api/status',
    '/api/ping',
    '/socket.io',
    '/favicon.ico',
    '/static',
    '/public'
  ];
  
  if (skipRoutes.some(route => req.originalUrl.startsWith(route))) {
    return next();
  }
  
  // Only log authenticated requests
  if (!req.user) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Capture response data
  const originalJson = res.json.bind(res);
  let responseData = null;
  
  res.json = function(data) {
    responseData = data;
    return originalJson(data);
  };
  
  // Log when response completes
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Parse user agent
      const deviceInfo = parseUserAgent(req.headers['user-agent']);
      
      // Generate detailed description
      const { description, details } = generateDetailedDescription(req, res, responseData);
      
      // Determine status
      const status = statusCode >= 200 && statusCode < 300 ? 'success' :
                     statusCode >= 400 && statusCode < 500 ? 'failure' : 'error';
      
      // Create comprehensive audit log
      const logData = {
        // User Information
        performedBy: req.user._id,
        performedByRole: req.user.role || req.user.roles?.[0] || 'unknown',
        performedByName: req.user.name,
        performedByEmail: req.user.email,
        
        // Request Information
        action: `${req.method}_${getEntityType(req.originalUrl) || 'API'}`,
        description: description,
        actionType: req.method.toLowerCase(),
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        requestBody: sanitizeBody(req.body),
        requestQuery: req.query,
        requestParams: req.params,
        
        // Response Information
        statusCode: statusCode,
        status: status,
        responseTime: duration,
        
        // Network Information
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        deviceInfo: deviceInfo,
        
        // Categorization
        category: getCategory(req.originalUrl),
        severity: getSeverity(req.method, statusCode, req.originalUrl),
        
        // Entity Information
        targetResource: getEntityType(req.originalUrl),
        targetResourceId: extractEntityId(req.originalUrl),
        
        // Detailed Information
        details: {
          ...details,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          headers: {
            referer: req.headers.referer,
            origin: req.headers.origin
          }
        },
        
        // Security Flags
        isSuspicious: statusCode === 401 || statusCode === 403,
        
        timestamp: new Date()
      };
      
      // Fire and forget - don't block the request
      AuditLog.create(logData).catch(err => {
        console.error('❌ Audit log creation error:', err.message);
      });
      
    } catch (error) {
      console.error('❌ Audit middleware error:', error.message);
    }
  });
  
  next();
};

module.exports = comprehensiveAuditLogger;
