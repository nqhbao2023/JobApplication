import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import { getAllCategories, getCategoryById } from '../controllers/category.controller';

const router = Router();

router.get('/', apiLimiter, getAllCategories);
router.get('/:id', apiLimiter, getCategoryById);

export default router;

