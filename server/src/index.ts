import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import jobRoutes from './routes/job.routes';
import aiRoutes from './routes/ai.routes';
import newsRoutes from './routes/news.routes';
import authRoutes from './routes/auth.routes';
import applicationRoutes from './routes/application.routes';
import companyRoutes from './routes/company.routes';
import categoryRoutes from './routes/category.routes';
import notificationRoutes from './routes/notification.routes';
import userRoutes from './routes/user.routes';
import quickPostRoutes from './routes/quickpost.routes'; // ✅ NEW
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Security & Performance
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS - Cho phép tất cả local development IPs
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:19000',
  'http://localhost:8081',
];

// Helper: Kiểm tra origin có phải local/private IP không
const isLocalOrigin = (origin: string): boolean => {
  // Cho phép localhost
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  
  // Cho phép Expo dev client
  if (origin.startsWith('exp://')) return true;
  
  // Cho phép private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const privateIPRegex = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})/;
  if (privateIPRegex.test(origin)) return true;
  
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép requests không có origin (curl, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Cho phép nếu nằm trong whitelist hoặc là local IP
    if (allowedOrigins.includes(origin) || isLocalOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/quick-posts', quickPostRoutes); // ✅ NEW: Quick Post Jobs
app.use('/api/ai', aiRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Hiển thị IP hiện tại của máy
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'unknown';
  
  for (const name of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== 'unknown') break;
  }
  
  console.log(` Local: http://localhost:${PORT}`);
  console.log(` Network: http://${localIP}:${PORT}`);
});

export default app;

