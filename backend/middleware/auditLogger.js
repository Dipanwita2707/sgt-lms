const AuditLogService = require('../services/auditLogService');

/**
 * Middleware to automatically log all requests
 * Can be applied globally or to specific routes
 */

const auditLogger = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original send function
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseBody = null;
    let statusCode = null;
    
    // Override res.send to capture response
    res.send = function(data) {
      responseBody = data;
      statusCode = res.statusCode;
      res.send = originalSend;
      return originalSend.call(this, data);
    };
    
    // Override res.json to capture response
    res.json = function(data) {
      responseBody = data;
      statusCode = res.statusCode;
      res.json = originalJson;
      return originalJson.call(this, data);
    };
    
    // Wait for response to finish
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const userId = req.user?._id || req.user?.id;
        
        // Skip logging for certain routes (to avoid log overflow)
        const skipRoutes = [
          '/api/health',
          '/api/ping',
          '/socket.io',
          '/favicon.ico'
        ];
        
        const shouldSkip = skipRoutes.some(route => req.originalUrl.includes(route));
        if (shouldSkip && !options.forceLog) return;
        
        // Only log if user is authenticated (unless forceLog is true)
        if (!userId && !options.forceLog) return;
        
        // Determine action name from route and method
        let action = `${req.method} ${req.originalUrl}`;
        
        // Try to make action more descriptive
        if (req.originalUrl.includes('/login')) action = 'user_login';
        else if (req.originalUrl.includes('/logout')) action = 'user_logout';
        else if (req.originalUrl.includes('/register')) action = 'user_registration';
        else if (req.originalUrl.includes('/students') && req.method === 'POST') action = 'create_student';
        else if (req.originalUrl.includes('/students') && req.method === 'PUT') action = 'update_student';
        else if (req.originalUrl.includes('/students') && req.method === 'DELETE') action = 'delete_student';
        else if (req.originalUrl.includes('/teachers') && req.method === 'POST') action = 'create_teacher';
        else if (req.originalUrl.includes('/teachers') && req.method === 'PUT') action = 'update_teacher';
        else if (req.originalUrl.includes('/teachers') && req.method === 'DELETE') action = 'delete_teacher';
        else if (req.originalUrl.includes('/courses') && req.method === 'POST') action = 'create_course';
        else if (req.originalUrl.includes('/courses') && req.method === 'PUT') action = 'update_course';
        else if (req.originalUrl.includes('/courses') && req.method === 'DELETE') action = 'delete_course';
        else if (req.originalUrl.includes('/bulk')) action = 'bulk_operation';
        else if (req.originalUrl.includes('/export')) action = 'data_export';
        else if (req.originalUrl.includes('/analytics')) action = 'view_analytics';
        
        // Determine status
        let status = 'success';
        if (statusCode >= 500) status = 'error';
        else if (statusCode >= 400) status = 'failure';
        else if (statusCode >= 300) status = 'warning';
        
        // Extract error message if exists
        let errorMessage = null;
        if (responseBody && typeof responseBody === 'object') {
          errorMessage = responseBody.message || responseBody.error || null;
        }
        
        // Log the activity
        await AuditLogService.log({
          action: options.action || action,
          performedBy: userId,
          targetResource: options.targetResource,
          targetResourceId: options.targetResourceId,
          req,
          status,
          statusCode,
          errorMessage,
          duration,
          details: options.details || {
            method: req.method,
            url: req.originalUrl,
            query: req.query,
            params: req.params
          }
        });
        
      } catch (error) {
        console.error('Error in audit logger middleware:', error);
        // Don't throw - just log the error
      }
    });
    
    next();
  };
};

/**
 * Specific audit logger for critical actions
 */
const auditCriticalAction = (actionName, options = {}) => {
  return async (req, res, next) => {
    // Store original handlers
    const originalSend = res.send;
    const originalJson = res.json;
    const startTime = Date.now();
    
    let statusCode = null;
    let responseData = null;
    
    // Override response methods
    res.send = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      res.send = originalSend;
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      res.json = originalJson;
      return originalJson.call(this, data);
    };
    
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const userId = req.user?._id || req.user?.id;
        
        let status = 'success';
        if (statusCode >= 500) status = 'error';
        else if (statusCode >= 400) status = 'failure';
        
        let errorMessage = null;
        if (responseData && typeof responseData === 'object') {
          errorMessage = responseData.message || responseData.error || null;
        }
        
        await AuditLogService.log({
          action: actionName,
          performedBy: userId,
          targetUser: req.params.userId || req.body.userId || req.params.id,
          targetResource: options.targetResource,
          targetResourceId: req.params.id || req.body.id,
          req,
          status,
          statusCode,
          errorMessage,
          duration,
          details: {
            ...options.details,
            params: req.params,
            query: req.query,
            body: AuditLogService.sanitizeRequestBody(req.body)
          },
          changes: options.changes
        });
        
      } catch (error) {
        console.error('Error in critical action audit logger:', error);
      }
    });
    
    next();
  };
};

module.exports = {
  auditLogger,
  auditCriticalAction
};
