const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * Comprehensive Audit Logging Service
 * Handles all audit logging with detailed tracking
 */

class AuditLogService {
  
  /**
   * Parse User Agent string
   */
  static parseUserAgent(userAgent) {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    
    // Browser detection
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) browser = 'Internet Explorer';
    
    // OS detection
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    // Device detection
    let device = 'Desktop';
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) device = 'Mobile';
    else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) device = 'Tablet';
    
    return { browser, os, device };
  }
  
  /**
   * Get IP Address from request
   */
  static getIpAddress(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'Unknown';
  }
  
  /**
   * Sanitize request body (remove sensitive data)
   */
  static sanitizeRequestBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'confirmPassword', 'token', 'refreshToken', 'secret'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    return sanitized;
  }
  
  /**
   * Determine action category based on action name
   */
  static categorizeAction(action, targetResource) {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('login') || actionLower.includes('logout') || actionLower.includes('register')) {
      return 'authentication';
    }
    if (actionLower.includes('permission') || actionLower.includes('role') || actionLower.includes('access')) {
      return 'authorization';
    }
    if (actionLower.includes('user') && !actionLower.includes('student') && !actionLower.includes('teacher')) {
      return 'user_management';
    }
    if (actionLower.includes('student')) {
      return 'student_management';
    }
    if (actionLower.includes('teacher')) {
      return 'teacher_management';
    }
    if (actionLower.includes('course') || actionLower.includes('unit') || actionLower.includes('video')) {
      return 'course_management';
    }
    if (actionLower.includes('content') || actionLower.includes('upload') || actionLower.includes('media')) {
      return 'content_management';
    }
    if (actionLower.includes('analytics') || actionLower.includes('report') || actionLower.includes('statistics')) {
      return 'analytics';
    }
    if (actionLower.includes('setting') || actionLower.includes('config')) {
      return 'settings';
    }
    if (actionLower.includes('security') || actionLower.includes('ban') || actionLower.includes('suspend')) {
      return 'security';
    }
    if (actionLower.includes('bulk') || actionLower.includes('batch')) {
      return 'bulk_operations';
    }
    if (actionLower.includes('export')) {
      return 'data_export';
    }
    if (actionLower.includes('import')) {
      return 'data_import';
    }
    if (actionLower.includes('system')) {
      return 'system';
    }
    
    // Use targetResource if available
    if (targetResource) {
      if (targetResource === 'course') return 'course_management';
      if (targetResource === 'student') return 'student_management';
      if (targetResource === 'teacher') return 'teacher_management';
    }
    
    return 'other';
  }
  
  /**
   * Determine action type
   */
  static getActionType(action, method) {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('register') || method === 'POST') {
      return 'create';
    }
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify') || method === 'PUT' || method === 'PATCH') {
      return 'update';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove') || method === 'DELETE') {
      return 'delete';
    }
    if (actionLower.includes('login')) {
      return 'login';
    }
    if (actionLower.includes('logout')) {
      return 'logout';
    }
    if (actionLower.includes('access') || actionLower.includes('view') || method === 'GET') {
      return 'access';
    }
    if (actionLower.includes('export')) {
      return 'export';
    }
    if (actionLower.includes('import')) {
      return 'import';
    }
    
    return 'other';
  }
  
  /**
   * Determine severity level
   */
  static getSeverity(action, status, category) {
    const actionLower = action.toLowerCase();
    
    // Critical actions
    if (actionLower.includes('delete') || actionLower.includes('remove') || 
        actionLower.includes('ban') || actionLower.includes('suspend') ||
        actionLower.includes('reset_password') || actionLower.includes('deactivate')) {
      return 'critical';
    }
    
    // High severity
    if (status === 'failure' || status === 'error') return 'high';
    if (category === 'security' || category === 'authorization') return 'high';
    if (actionLower.includes('permission') || actionLower.includes('role') || 
        actionLower.includes('bulk') || actionLower.includes('export')) {
      return 'high';
    }
    
    // Medium severity
    if (actionLower.includes('update') || actionLower.includes('edit') || 
        actionLower.includes('create') || actionLower.includes('add')) {
      return 'medium';
    }
    
    // Low severity
    if (actionLower.includes('view') || actionLower.includes('access') || 
        actionLower.includes('read') || actionLower.includes('get')) {
      return 'low';
    }
    
    return 'info';
  }
  
  /**
   * Detect suspicious activity
   */
  static isSuspiciousActivity(data) {
    // Multiple failed logins
    if (data.action.includes('login') && data.status === 'failure') return true;
    
    // Access denied / unauthorized attempts
    if (data.statusCode === 401 || data.statusCode === 403) return true;
    
    // Bulk delete operations
    if (data.action.includes('bulk') && data.action.includes('delete')) return true;
    
    // Unusual hours (midnight to 5am)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5 && data.severity === 'critical') return true;
    
    return false;
  }
  
  /**
   * Main logging function
   */
  static async log(options) {
    try {
      const {
        action,
        performedBy,
        targetUser = null,
        targetResource = null,
        targetResourceId = null,
        details = {},
        changes = null,
        req = null,
        status = 'success',
        statusCode = 200,
        errorMessage = null,
        duration = 0,
        tags = []
      } = options;
      
      // Get user info if ID is provided
      let performedByUser = null;
      if (performedBy) {
        if (typeof performedBy === 'object' && performedBy._id) {
          performedByUser = performedBy;
        } else {
          performedByUser = await User.findById(performedBy).select('name email role');
        }
      }
      
      // Get target user info if ID is provided
      let targetUserData = null;
      if (targetUser) {
        if (typeof targetUser === 'object' && targetUser._id) {
          targetUserData = targetUser;
        } else {
          targetUserData = await User.findById(targetUser).select('name email role');
        }
      }
      
      // Extract request data
      const requestMethod = req?.method || 'UNKNOWN';
      const requestUrl = req?.originalUrl || req?.url || '';
      const ipAddress = req ? this.getIpAddress(req) : 'System';
      const userAgent = req?.headers['user-agent'] || '';
      const deviceInfo = this.parseUserAgent(userAgent);
      const requestBody = req?.body ? this.sanitizeRequestBody(req.body) : null;
      
      // Determine category and type
      const category = this.categorizeAction(action, targetResource);
      const actionType = this.getActionType(action, requestMethod);
      const severity = this.getSeverity(action, status, category);
      
      // Create audit log entry
      const logData = {
        action,
        actionType,
        performedBy: performedByUser?._id || performedBy,
        performedByRole: performedByUser?.role || 'unknown',
        performedByName: performedByUser?.name || 'System',
        performedByEmail: performedByUser?.email || '',
        targetUser: targetUserData?._id || targetUser,
        targetUserRole: targetUserData?.role,
        targetUserName: targetUserData?.name,
        targetResource,
        targetResourceId,
        ipAddress,
        userAgent,
        requestMethod,
        requestUrl,
        requestBody,
        status,
        statusCode,
        errorMessage,
        severity,
        category,
        details,
        changes,
        deviceInfo,
        duration,
        tags,
        timestamp: new Date(),
        isSystemGenerated: !req,
        isSuspicious: false,
        requiresReview: false
      };
      
      // Check for suspicious activity
      logData.isSuspicious = this.isSuspiciousActivity(logData);
      logData.requiresReview = logData.isSuspicious || severity === 'critical';
      
      // Create the audit log
      const auditLog = await AuditLog.create(logData);
      
      return auditLog;
      
    } catch (error) {
      console.error('❌ Error in AuditLogService.log:', error);
      // Don't throw to avoid breaking application flow
      return null;
    }
  }
  
  /**
   * Get statistics for dashboard
   */
  static async getStatistics(filters = {}) {
    try {
      const query = {};
      
      // Date range
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }
      
      // Get total logs
      const totalLogs = await AuditLog.countDocuments(query);
      
      // Get logs by status
      const statusCounts = await AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      
      // Get logs by category
      const categoryCounts = await AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      // Get logs by severity
      const severityCounts = await AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]);
      
      // Get suspicious activities
      const suspiciousCount = await AuditLog.countDocuments({ 
        ...query, 
        isSuspicious: true 
      });
      
      // Get pending reviews
      const pendingReviews = await AuditLog.countDocuments({ 
        ...query, 
        requiresReview: true, 
        reviewed: false 
      });
      
      // Get top users by activity
      const topUsers = await AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$performedBy', count: { $sum: 1 }, name: { $first: '$performedByName' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      // Get activity timeline (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const timeline = await AuditLog.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { 
          $group: { 
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      
      return {
        totalLogs,
        statusCounts: statusCounts.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        categoryCounts,
        severityCounts: severityCounts.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        suspiciousCount,
        pendingReviews,
        topUsers,
        timeline
      };
      
    } catch (error) {
      console.error('Error getting audit log statistics:', error);
      throw error;
    }
  }
  
  /**
   * Export logs to CSV
   */
  static async exportToCSV(filters = {}) {
    try {
      const logs = await AuditLog.advancedSearch({ ...filters, limit: 10000 });
      
      const csv = [
        // Header
        ['Timestamp', 'Action', 'Type', 'Performed By', 'Role', 'Target User', 'Category', 'Status', 'Severity', 'IP Address', 'Details'].join(','),
        // Data rows
        ...logs.map(log => [
          log.createdAt.toISOString(),
          log.action,
          log.actionType,
          log.performedByName || log.performedByEmail,
          log.performedByRole,
          log.targetUserName || '',
          log.category,
          log.status,
          log.severity,
          log.ipAddress,
          JSON.stringify(log.details || {}).replace(/,/g, ';')
        ].join(','))
      ].join('\n');
      
      return csv;
      
    } catch (error) {
      console.error('Error exporting logs to CSV:', error);
      throw error;
    }
  }
  
}

module.exports = AuditLogService;
