const rateLimit = require('express-rate-limit');

// General rate limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator which properly handles IPv6
  // keyGenerator: default behavior handles IPv6 correctly
});

// Auth-specific rate limiter: 10 requests per 10 minutes per IP
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator which properly handles IPv6
  // keyGenerator: default behavior handles IPv6 correctly
});

module.exports = { generalLimiter, authLimiter };
