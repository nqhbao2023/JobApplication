import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import {
  createQuickPostJob,
  getPendingQuickPosts,
  approveQuickPost,
  rejectQuickPost,
} from '../controllers/quickpost.controller';

const router = Router();

// Public route - không cần auth
router.post('/', apiLimiter, createQuickPostJob);

// Admin routes
router.get('/pending', authenticate, authorize('admin'), getPendingQuickPosts);
router.patch('/:id/approve', authenticate, authorize('admin'), approveQuickPost);
router.patch('/:id/reject', authenticate, authorize('admin'), rejectQuickPost);

export default router;
