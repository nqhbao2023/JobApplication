import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { getUnreadCount, getNotifications } from '../controllers/notification.controller';

const router = Router();

router.get('/unread-count', authenticate, apiLimiter, getUnreadCount);
router.get('/', authenticate, apiLimiter, getNotifications);

export default router;

