import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import {
  recommendJobs,
  enhanceDescription,
  extractSkills,
} from '../controllers/ai.controller';

const router = Router();

router.get('/recommend', authenticate, authorize('candidate'), apiLimiter, recommendJobs);
router.post('/enhance-description', authenticate, authorize('employer', 'admin'), apiLimiter, enhanceDescription);
router.post('/extract-skills', authenticate, apiLimiter, extractSkills);

export default router;

