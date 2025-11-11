import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Current user routes
router.get('/me', authMiddleware, userController.getMe);
router.put('/me', authMiddleware, userController.updateMe);
router.post('/me/avatar', authMiddleware, upload.single('avatar'), userController.uploadAvatar);

// Get user by ID (public)
router.get('/:userId', userController.getUserById);

// Admin routes (will need admin middleware)
// router.get('/', authMiddleware, adminMiddleware, userController.getAllUsers);
// router.post('/', authMiddleware, adminMiddleware, userController.createUser);
// router.put('/:userId', authMiddleware, adminMiddleware, userController.updateUser);
// router.delete('/:userId', authMiddleware, adminMiddleware, userController.deleteUser);

export default router;
