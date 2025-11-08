import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/verify', authLimiter, authenticate, (req, res) => {
  res.json({ user: req.user, message: 'Token is valid' });
});

export default router;

