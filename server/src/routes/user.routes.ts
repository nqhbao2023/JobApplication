import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { getCurrentUser, bootstrapUserProfile } from '../controllers/user.controller';
import { upsertUserSchema } from '../validators/user.validator';

const router = Router();

router.get('/me', authenticate, apiLimiter, getCurrentUser);
router.post('/bootstrap', authenticate, apiLimiter, validate(upsertUserSchema), bootstrapUserProfile);

export default router;
