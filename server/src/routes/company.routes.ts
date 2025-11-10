import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import { getAllCompanies, getCompanyById } from '../controllers/company.controller';

const router = Router();

router.get('/', apiLimiter, getAllCompanies);
router.get('/:id', apiLimiter, getCompanyById);

export default router;

