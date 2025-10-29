const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('🔧 Setting up proxy middleware...');
  
  // Get the target URL from environment
  const target = process.env.REACT_APP_API_URL;
  console.log('🎯 Proxy target:', target);
  console.log('🔍 REACT_APP_API_URL env var:', process.env.REACT_APP_API_URL);

  // Enhanced pre-filter middleware to catch malformed requests
  app.use(
    function(req, res, next) {
      // Comprehensive path validation
      const path = req.path || req.url || '';
      const originalUrl = req.originalUrl || '';
      
      // Check for various forms of malformed paths - but allow root path for React app
      if (!path || 
          path === 'undefined' || 
          path === '/undefined' ||
          path.includes('undefined') ||
          originalUrl.includes('undefined') ||
          path === 'unknown_path' ||
          originalUrl.includes('unknown_path')) {
        
        console.error('🚫 Blocking malformed request:', {
          path: path,
          originalUrl: originalUrl,
          url: req.url,
          method: req.method,
          headers: req.headers
        });
        
        return res.status(400).json({ 
          error: 'Invalid API endpoint', 
          path: path,
          message: 'Malformed request path detected'
        });
      }
      next();
    }
  );

  // Separate proxy for Socket.IO with specific configuration
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
      secure: false, // Allow self-signed certificates
      ws: true, // Enable WebSocket proxying
      logLevel: 'warn', // Reduce log noise
      timeout: 30000, // 30 second timeout
      proxyTimeout: 30000,
      pathRewrite: {
        '^/socket.io': '/socket.io'
      },
      onProxyReq: (proxyReq, req, res) => {
        const path = req?.path || req?.url || 'unknown_path';
        console.log(`🔌 Socket.IO proxy: ${req.method} ${path} -> ${target}${path}`);
      },
      onError: (err, req, res) => {
        const path = req?.path || req?.url || req?.originalUrl || 'unknown_path';
        // Only log significant errors, not every socket hang up
        if (err.code !== 'ECONNRESET' && !err.message.includes('socket hang up')) {
          console.error('❌ Socket.IO proxy error:', {
            error: err.message,
            code: err.code,
            path: path,
            target: target
          });
        }
      }
    })
  );

  // API proxy with enhanced validation
  app.use(
    '/api',
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
      secure: false, // Allow self-signed certificates
      logLevel: 'info',
      xfwd: true,
      followRedirects: true,
      // Enhanced skip function for static assets and malformed requests
      skip: function (req, res) {
        const path = req.path || req.url || '';
        
        // Skip malformed paths (additional safety check)
        if (!path || 
            path === 'undefined' || 
            path === '/undefined' || 
            path.includes('undefined') ||
            path === 'unknown_path' ||
            path.includes('unknown_path')) {
          console.error('🚫 API proxy skipping malformed path:', path);
          return true;
        }
        
        // Skip static assets
        return path.includes('favicon.ico') || 
               path.includes('.js') || 
               path.includes('.css') || 
               path.includes('.png') || 
               path.includes('.ico') ||
               path.includes('.svg') ||
               path.includes('.json') ||
               path.includes('.xml');
      },
      onProxyReq: (proxyReq, req, res) => {
        const path = req.path || req.url || '';
        
        // Final safety check with comprehensive validation
        if (!path || 
            path === 'undefined' || 
            path === '/undefined' || 
            path.includes('undefined') ||
            path === 'unknown_path' ||
            path.includes('unknown_path') ||
            path === '' ||
            typeof path !== 'string') {
          
          console.error('🚨 MALFORMED PATH in API proxy onProxyReq:', {
            path: path,
            url: req.url,
            originalUrl: req.originalUrl,
            method: req.method,
            headers: Object.keys(req.headers || {})
          });
          
          // Abort this proxy request to prevent socket hang up
          proxyReq.destroy();
          return;
        }
        
        // Ensure path starts with /api
        const safePath = path.startsWith('/api') ? path : '/api' + path;
        console.log(`📤 API Proxy: ${req.method} ${safePath} -> ${target}${safePath}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`📥 Proxy response: ${proxyRes.statusCode} for ${req.path}`);
        // Add CORS headers if not present
        if (!proxyRes.headers['access-control-allow-origin']) {
          proxyRes.headers['access-control-allow-origin'] = '*';
        }
        if (!proxyRes.headers['access-control-allow-credentials']) {
          proxyRes.headers['access-control-allow-credentials'] = 'true';
        }
      },
      onError: (err, req, res) => {
        const path = req?.path || req?.url || req?.originalUrl || '';
        
        // Enhanced error logging with request context
        console.error('❌ API Proxy error:', {
          error: err.message,
          code: err.code,
          path: path,
          method: req?.method,
          target: target,
          headers: req?.headers ? Object.keys(req.headers) : []
        });
        
        // Check for specific error types
        if (err.code === 'ECONNRESET' || err.message.includes('socket hang up')) {
          console.error('   ⚠️ Socket connection lost - backend may be down or network issue');
        } else if (err.code === 'ECONNREFUSED') {
          console.error('   ⚠️ Connection refused - backend server not running');
        } else if (err.code === 'ENOTFOUND') {
          console.error('   ⚠️ Host not found - check target URL');
        }
        
        // Only send error response for legitimate HTTP requests
        if (res && 
            typeof res.status === 'function' && 
            !res.headersSent && 
            path && 
            path !== 'unknown_path' &&
            !path.includes('undefined') &&
            !err.message.includes('socket hang up')) {
          
          try {
            res.status(502).json({ 
              error: 'API Gateway Error', 
              message: `Backend connection failed: ${err.message}`,
              target: target,
              path: path,
              timestamp: new Date().toISOString()
            });
          } catch (responseError) {
            console.error('❌ Failed to send error response:', responseError.message);
          }
        }
      }
    })
  );
  
  console.log('✅ Proxy middleware setup complete');
};
