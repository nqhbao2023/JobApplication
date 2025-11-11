import rateLimit from 'express-rate-limit';

// ✅ Tắt rate limiting trong development, tăng limit trong production
const isDevelopment = process.env.NODE_ENV !== 'production';

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 phút thay vì 15 phút
  max: isDevelopment ? 1000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10), // Dev: 1000, Prod: 200
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment, // ✅ Tắt hoàn toàn trong dev
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 5, // Dev: 100, Prod: 5
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later.',
  },
  skip: () => isDevelopment, // ✅ Tắt hoàn toàn trong dev
});

