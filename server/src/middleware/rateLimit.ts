import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for Quick Post submissions
 * Max 5 posts per hour per IP
 */
export const quickPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // max 100 requests per windowMs (increased for demo/testing)
  message: {
    error: 'Too many quick posts from this IP. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Use IP from request
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  },
  
  // Skip rate limiting for admin users (if authenticated)
  skip: (req: any) => {
    return req.user?.role === 'admin';
  },
});

/**
 * Stricter rate limit for suspicious activity
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: {
    error: 'Too many requests. Your IP has been temporarily blocked.',
  },
});
