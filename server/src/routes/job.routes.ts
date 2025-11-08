import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { apiLimiter } from '../middleware/rateLimiter';
import {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getEmployerJobs,
} from '../controllers/job.controller';
import { createJobSchema, updateJobSchema } from '../validators/job.validator';

const router = Router();

router.get('/', apiLimiter, getAllJobs);
router.get('/my-jobs', authenticate, authorize('employer', 'admin'), getEmployerJobs);
router.get('/:id', apiLimiter, getJobById);
router.post('/', authenticate, authorize('employer', 'admin'), validate(createJobSchema), createJob);
router.put('/:id', authenticate, authorize('employer', 'admin'), validate(updateJobSchema), updateJob);
router.delete('/:id', authenticate, authorize('employer', 'admin'), deleteJob);

export default router;

