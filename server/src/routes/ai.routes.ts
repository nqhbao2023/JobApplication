import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import {
  recommendJobs,
  enhanceDescription,
  extractSkills,
  askAI,
  categorizeJob,
  analyzeCV,
  predictSalary,
} from '../controllers/ai.controller';

const router = Router();

router.get('/recommend', authenticate, authorize('candidate'), apiLimiter, recommendJobs);
router.post('/enhance-description', authenticate, authorize('employer', 'admin'), apiLimiter, enhanceDescription);
router.post('/extract-skills', authenticate, apiLimiter, extractSkills);
router.post('/ask', authenticate, apiLimiter, askAI);
router.post('/categorize', authenticate, apiLimiter, categorizeJob);
router.post('/analyze-cv', authenticate, apiLimiter, analyzeCV);
router.post('/predict-salary', authenticate, apiLimiter, predictSalary);

export default router;