import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { getSavedJobs, saveJob, removeSavedJob } from '../controllers/savedJob.controller';

const router = Router();

router.get('/', authenticate, authorize('candidate'), apiLimiter, getSavedJobs);
router.post('/:jobId', authenticate, authorize('candidate'), apiLimiter, saveJob);
router.delete('/:jobId', authenticate, authorize('candidate'), apiLimiter, removeSavedJob);

export default router;
