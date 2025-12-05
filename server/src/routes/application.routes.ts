import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { apiLimiter } from '../middleware/rateLimiter';
import {
  createApplication,
  getCandidateApplications,
  getEmployerApplications,
  getJobApplications,
  updateApplication,
  updateApplicationStatus,
  withdrawApplication,
  deleteApplication,
} from '../controllers/application.controller';
import { createApplicationSchema } from '../validators/application.validator';

const router = Router();

router.post('/', authenticate, authorize('candidate'), validate(createApplicationSchema), apiLimiter, createApplication);
router.get('/my-applications', authenticate, authorize('candidate'), getCandidateApplications);
router.get('/employer-applications', authenticate, authorize('employer', 'admin'), getEmployerApplications);
router.get('/job/:jobId', authenticate, authorize('employer', 'admin'), getJobApplications);
router.patch('/:id', authenticate, authorize('candidate'), updateApplication);
router.patch('/:id/status', authenticate, authorize('employer', 'admin'), updateApplicationStatus);
router.delete('/:id', authenticate, authorize('candidate'), withdrawApplication);
// New route for permanent deletion (for deleted jobs)
router.delete('/:id/permanent', authenticate, authorize('candidate'), deleteApplication);

export default router;

