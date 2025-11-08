import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { getNews, refreshNews, scrapeNews } from '../controllers/news.controller';

const router = Router();

router.get('/', apiLimiter, getNews);
router.post('/refresh', authenticate, authorize('admin'), refreshNews);
router.post('/scrape', authenticate, authorize('admin'), scrapeNews);

export default router;

