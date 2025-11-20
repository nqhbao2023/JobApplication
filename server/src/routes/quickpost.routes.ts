import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { quickPostLimiter } from '../middleware/rateLimit';
import {
  createQuickPostJob,
  getPendingQuickPosts,
  approveQuickPost,
  rejectQuickPost,
  notifyQuickPostApplication,
} from '../controllers/quickpost.controller';

const router = Router();

// Public route - không cần auth, có rate limit chống spam
router.post('/', quickPostLimiter, createQuickPostJob);

// Protected routes (auth required)
router.post('/:id/notify', authenticate, notifyQuickPostApplication);

// Admin routes
router.get('/pending', authenticate, authorize('admin'), getPendingQuickPosts);
router.patch('/:id/approve', authenticate, authorize('admin'), approveQuickPost);
router.patch('/:id/reject', authenticate, authorize('admin'), rejectQuickPost);

export default router;
