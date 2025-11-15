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

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:19000',
  'http://192.168.1.58:19000',
  'exp://192.168.1.58:8081',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin?.includes('192.168.1.58')) {
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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Accessible at: http://localhost:${PORT} or http://192.168.1.35:${PORT}`);
});

export default app;

