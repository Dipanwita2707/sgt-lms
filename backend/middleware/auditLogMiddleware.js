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

// Helper to sanitize request body (remove sensitive data)
const sanitizeBody = (body) => {
  if (!body) return null;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'confirmPassword', 'token', 'secret'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

// Determine action category
const getCategory = (url, method) => {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('/auth/')) return 'authentication';
  if (urlLower.includes('/student')) return 'student_management';
  if (urlLower.includes('/teacher')) return 'teacher_management';
  if (urlLower.includes('/course')) return 'course_management';
  if (urlLower.includes('/quiz')) return 'course_management';
  if (urlLower.includes('/video')) return 'content_management';
  if (urlLower.includes('/analytics')) return 'analytics';
  if (urlLower.includes('/bulk')) return 'bulk_operations';
  if (urlLower.includes('/export')) return 'data_export';
  if (urlLower.includes('/import')) return 'data_import';
  if (urlLower.includes('/admin')) return 'user_management';
  if (urlLower.includes('/dean')) return 'user_management';
  if (urlLower.includes('/hod')) return 'user_management';
  
  return 'other';
};

// Get action type from method
const getActionType = (method) => {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    case 'GET': return 'read';
    default: return 'other';
  }
};

// Determine severity
const getSeverity = (method, statusCode) => {
  if (statusCode >= 500) return 'high';
  if (statusCode >= 400) return 'medium';
  if (method === 'DELETE') return 'high';
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') return 'medium';
  return 'low';
};

// Extract action name from URL and method
const getActionName = (url, method) => {
  const urlParts = url.split('?')[0].split('/').filter(Boolean);
  const resource = urlParts[urlParts.length - 1] || 'unknown';
  
  const methodActions = {
    'GET': 'VIEW',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  
  const action = methodActions[method] || 'ACCESS';
  return `${action}_${resource.toUpperCase()}`;
};

// Generate comprehensive and detailed human-readable description
const generateDescription = (url, method, user, statusCode) => {
  const urlLower = url.toLowerCase();
  const urlParts = url.split('?')[0].split('/').filter(Boolean);
  const userName = user?.name || 'Unknown User';
  const userRole = user?.role || user?.roles?.[0] || 'User';
  
  // Map method to verb
  const verbMap = {
    'GET': 'viewed',
    'POST': 'created',
    'PUT': 'updated',
    'PATCH': 'updated',
    'DELETE': 'deleted'
  };
  const verb = verbMap[method] || 'accessed';
  
  // Detailed resource and action detection
  let description = '';
  
  // Authentication & Authorization
  if (urlLower.includes('/auth/login')) {
    description = `${userName} (${userRole}) logged into the system`;
  }
  else if (urlLower.includes('/auth/logout')) {
    description = `${userName} (${userRole}) logged out from the system`;
  }
  else if (urlLower.includes('/auth/')) {
    description = `${userName} performed authentication operation`;
  }
  
  // Dashboard & Page Visits
  else if (urlLower.includes('/dashboard')) {
    const dashboardType = urlLower.includes('admin') ? 'Admin' : 
                         urlLower.includes('dean') ? 'Dean' :
                         urlLower.includes('hod') ? 'HOD' :
                         urlLower.includes('teacher') ? 'Teacher' :
                         urlLower.includes('student') ? 'Student' : 'Main';
    description = `${userName} (${userRole}) visited ${dashboardType} Dashboard page`;
  }
  
  // Student Management
  else if (urlLower.includes('/students') && method === 'GET') {
    description = `${userName} (${userRole}) viewed Students List page`;
  }
  else if (urlLower.includes('/student/') && urlLower.includes('/profile')) {
    description = `${userName} (${userRole}) ${verb} student profile details`;
  }
  else if (urlLower.includes('/student') && method === 'POST') {
    description = `${userName} (${userRole}) created a new student record`;
  }
  else if (urlLower.includes('/student') && method === 'PUT') {
    description = `${userName} (${userRole}) updated student information`;
  }
  else if (urlLower.includes('/student') && method === 'DELETE') {
    description = `${userName} (${userRole}) deleted a student record`;
  }
  else if (urlLower.includes('/student')) {
    description = `${userName} (${userRole}) ${verb} student data`;
  }
  
  // Teacher Management
  else if (urlLower.includes('/teachers') && method === 'GET') {
    description = `${userName} (${userRole}) viewed Teachers List page`;
  }
  else if (urlLower.includes('/teacher/') && urlLower.includes('/profile')) {
    description = `${userName} (${userRole}) ${verb} teacher profile details`;
  }
  else if (urlLower.includes('/teacher') && method === 'POST') {
    description = `${userName} (${userRole}) created a new teacher account`;
  }
  else if (urlLower.includes('/teacher') && method === 'PUT') {
    description = `${userName} (${userRole}) updated teacher information`;
  }
  else if (urlLower.includes('/teacher') && method === 'DELETE') {
    description = `${userName} (${userRole}) deleted a teacher account`;
  }
  else if (urlLower.includes('/teacher')) {
    description = `${userName} (${userRole}) ${verb} teacher data`;
  }
  
  // Course Management
  else if (urlLower.includes('/courses') && method === 'GET' && !urlLower.includes('/student/')) {
    description = `${userName} (${userRole}) viewed Courses List page`;
  }
  else if (urlLower.includes('/course/') && urlLower.includes('/details')) {
    description = `${userName} (${userRole}) viewed course details page`;
  }
  else if (urlLower.includes('/course/') && urlLower.includes('/edit')) {
    description = `${userName} (${userRole}) is editing course configuration`;
  }
  else if (urlLower.includes('/course') && method === 'POST') {
    description = `${userName} (${userRole}) created a new course`;
  }
  else if (urlLower.includes('/course') && method === 'PUT') {
    description = `${userName} (${userRole}) updated course details`;
  }
  else if (urlLower.includes('/course') && method === 'DELETE') {
    description = `${userName} (${userRole}) deleted a course`;
  }
  else if (urlLower.includes('/course')) {
    description = `${userName} (${userRole}) ${verb} course information`;
  }
  
  // Quiz & Assessments
  else if (urlLower.includes('/quizzes') && method === 'GET') {
    description = `${userName} (${userRole}) viewed Quizzes List page`;
  }
  else if (urlLower.includes('/quiz/') && urlLower.includes('/attempt')) {
    description = `${userName} (${userRole}) is attempting a quiz`;
  }
  else if (urlLower.includes('/quiz/') && urlLower.includes('/submit')) {
    description = `${userName} (${userRole}) submitted quiz answers`;
  }
  else if (urlLower.includes('/quiz/') && urlLower.includes('/results')) {
    description = `${userName} (${userRole}) viewed quiz results`;
  }
  else if (urlLower.includes('/quiz') && method === 'POST') {
    description = `${userName} (${userRole}) created a new quiz`;
  }
  else if (urlLower.includes('/quiz') && method === 'PUT') {
    description = `${userName} (${userRole}) updated quiz configuration`;
  }
  else if (urlLower.includes('/quiz')) {
    description = `${userName} (${userRole}) ${verb} quiz`;
  }
  
  // Video Content
  else if (urlLower.includes('/videos') && method === 'GET') {
    description = `${userName} (${userRole}) viewed Video Library page`;
  }
  else if (urlLower.includes('/video/') && urlLower.includes('/watch')) {
    description = `${userName} (${userRole}) is watching a video`;
  }
  else if (urlLower.includes('/video') && method === 'POST') {
    description = `${userName} (${userRole}) uploaded a new video`;
  }
  else if (urlLower.includes('/video')) {
    description = `${userName} (${userRole}) ${verb} video content`;
  }
  
  // Assignments
  else if (urlLower.includes('/assignments') && method === 'GET') {
    description = `${userName} (${userRole}) viewed Assignments page`;
  }
  else if (urlLower.includes('/assignment/') && urlLower.includes('/submit')) {
    description = `${userName} (${userRole}) submitted an assignment`;
  }
  else if (urlLower.includes('/assignment/') && urlLower.includes('/grade')) {
    description = `${userName} (${userRole}) graded an assignment submission`;
  }
  else if (urlLower.includes('/assignment') && method === 'POST') {
    description = `${userName} (${userRole}) created a new assignment`;
  }
  else if (urlLower.includes('/assignment')) {
    description = `${userName} (${userRole}) ${verb} assignment`;
  }
  
  // Analytics & Reports
  else if (urlLower.includes('/analytics') && method === 'GET') {
    const analyticsType = urlLower.includes('student') ? 'Student Analytics' :
                         urlLower.includes('course') ? 'Course Analytics' :
                         urlLower.includes('teacher') ? 'Teacher Analytics' :
                         urlLower.includes('department') ? 'Department Analytics' : 'Analytics';
    description = `${userName} (${userRole}) viewed ${analyticsType} page`;
  }
  else if (urlLower.includes('/export')) {
    const exportType = urlLower.includes('student') ? 'student data' :
                      urlLower.includes('course') ? 'course data' :
                      urlLower.includes('analytics') ? 'analytics report' : 'data';
    description = `${userName} (${userRole}) exported ${exportType}`;
  }
  else if (urlLower.includes('/report')) {
    description = `${userName} (${userRole}) ${verb} report`;
  }
  
  // Bulk Upload
  else if (urlLower.includes('/bulk-upload')) {
    const uploadType = urlLower.includes('student') ? 'students' :
                      urlLower.includes('teacher') ? 'teachers' :
                      urlLower.includes('course') ? 'courses' : 'data';
    description = `${userName} (${userRole}) performed bulk upload of ${uploadType}`;
  }
  
  // Certificates
  else if (urlLower.includes('/certificate') && method === 'GET') {
    description = `${userName} (${userRole}) viewed Certificates page`;
  }
  else if (urlLower.includes('/certificate/') && urlLower.includes('/download')) {
    description = `${userName} (${userRole}) downloaded a certificate`;
  }
  else if (urlLower.includes('/certificate/') && urlLower.includes('/generate')) {
    description = `${userName} (${userRole}) generated a new certificate`;
  }
  else if (urlLower.includes('/certificate')) {
    description = `${userName} (${userRole}) ${verb} certificate`;
  }
  
  // Announcements
  else if (urlLower.includes('/announcements') && method === 'GET') {
    description = `${userName} (${userRole}) viewed Announcements page`;
  }
  else if (urlLower.includes('/announcement') && method === 'POST') {
    description = `${userName} (${userRole}) created a new announcement`;
  }
  else if (urlLower.includes('/announcement')) {
    description = `${userName} (${userRole}) ${verb} announcement`;
  }
  
  // Live Classes
  else if (urlLower.includes('/live-class') && urlLower.includes('/join')) {
    description = `${userName} (${userRole}) joined a live class session`;
  }
  else if (urlLower.includes('/live-class') && method === 'POST') {
    description = `${userName} (${userRole}) created a new live class`;
  }
  else if (urlLower.includes('/live-class')) {
    description = `${userName} (${userRole}) ${verb} live class`;
  }
  
  // Chat & Messaging
  else if (urlLower.includes('/chat') || urlLower.includes('/message')) {
    description = `${userName} (${userRole}) ${verb} chat messages`;
  }
  
  // Notifications
  else if (urlLower.includes('/notifications') && method === 'GET') {
    description = `${userName} (${userRole}) checked notifications`;
  }
  else if (urlLower.includes('/notification/') && urlLower.includes('/read')) {
    description = `${userName} (${userRole}) marked notification as read`;
  }
  
  // Settings & Configuration
  else if (urlLower.includes('/settings')) {
    description = `${userName} (${userRole}) ${verb} system settings`;
  }
  else if (urlLower.includes('/profile')) {
    description = `${userName} (${userRole}) ${verb} their profile`;
  }
  
  // Admin Operations
  else if (urlLower.includes('/admin/users') && method === 'GET') {
    description = `${userName} (${userRole}) viewed User Management page`;
  }
  else if (urlLower.includes('/admin/roles')) {
    description = `${userName} (${userRole}) viewed Audit Logs & Activity page`;
  }
  else if (urlLower.includes('/admin/schools')) {
    description = `${userName} (${userRole}) ${verb} school configuration`;
  }
  else if (urlLower.includes('/admin/departments')) {
    description = `${userName} (${userRole}) ${verb} department settings`;
  }
  else if (urlLower.includes('/admin')) {
    description = `${userName} (${userRole}) accessed Admin Panel`;
  }
  
  // Dean Operations
  else if (urlLower.includes('/dean')) {
    description = `${userName} (${userRole}) accessed Dean Dashboard`;
  }
  
  // HOD Operations
  else if (urlLower.includes('/hod')) {
    description = `${userName} (${userRole}) accessed HOD Dashboard`;
  }
  
  // Department & School
  else if (urlLower.includes('/department')) {
    description = `${userName} (${userRole}) ${verb} department`;
  }
  else if (urlLower.includes('/school')) {
    description = `${userName} (${userRole}) ${verb} school`;
  }
  else if (urlLower.includes('/section')) {
    description = `${userName} (${userRole}) ${verb} section`;
  }
  
  // API Operations
  else if (urlLower.includes('/api/')) {
    const resource = urlParts[urlParts.length - 1] || 'API endpoint';
    description = `${userName} (${userRole}) ${verb} ${resource}`;
  }
  
  // Default fallback
  else {
    const resource = urlParts[urlParts.length - 1] || 'page';
    description = `${userName} (${userRole}) ${verb} ${resource}`;
  }
  
  // Add status information
  const statusText = statusCode >= 200 && statusCode < 300 ? ' successfully' : 
                    statusCode >= 400 && statusCode < 500 ? ' (failed)' :
                    statusCode >= 500 ? ' (error)' : '';
  
  return description + statusText;
};

// Middleware to log API requests
const auditLogMiddleware = async (req, res, next) => {
  // Skip logging for certain routes
  const skipRoutes = [
    '/api/health',
    '/api/status',
    '/api/ping',
    '/socket.io',
    '/favicon.ico'
  ];
  
  if (skipRoutes.some(route => req.originalUrl.startsWith(route))) {
    return next();
  }
  
  // Skip GET requests for read-only operations (optional - comment out to log all GET requests)
  // if (req.method === 'GET') {
  //   return next();
  // }
  
  const startTime = Date.now();
  
  // Capture original res.json to intercept response
  const originalJson = res.json.bind(res);
  let responseBody = null;
  
  res.json = function(data) {
    responseBody = data;
    return originalJson(data);
  };
  
  // Wait for response to complete
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const status = statusCode >= 200 && statusCode < 300 ? 'success' : 
                     statusCode >= 400 && statusCode < 500 ? 'failure' : 'error';
      
      // Only log if user is authenticated
      // Auth attempts are logged separately in authController
      if (!req.user) {
        return;
      }
      
      const logData = {
        action: getActionName(req.originalUrl, req.method),
        description: generateDescription(req.originalUrl, req.method, req.user, statusCode),
        actionType: getActionType(req.method),
        performedBy: req.user._id,
        performedByRole: req.user.role || req.user.roles?.[0] || 'unknown',
        performedByName: req.user.name,
        performedByEmail: req.user.email,
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        requestBody: sanitizeBody(req.body),
        status,
        statusCode,
        severity: getSeverity(req.method, statusCode),
        category: getCategory(req.originalUrl, req.method),
        duration,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          params: req.params,
          statusCode,
          duration: `${duration}ms`,
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
      };
      
      // Flag suspicious activity
      if (statusCode === 401 || statusCode === 403) {
        logData.isSuspicious = true;
      }
      
      // Don't wait for audit log to save (fire and forget for performance)
      AuditLog.create(logData).catch(err => {
        console.error('Error creating audit log:', err);
      });
      
    } catch (error) {
      console.error('Audit log middleware error:', error);
      // Don't fail the request if logging fails
    }
  });
  
  next();
};

module.exports = auditLogMiddleware;
