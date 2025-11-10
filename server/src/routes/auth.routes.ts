import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { Response } from 'express';

const router = Router();

/**
 * GET /api/auth/verify
 * Xác thực token hiện tại
 */
router.get('/verify', authLimiter, authenticate, (req: AuthRequest, res: Response) => {
  res.json({ 
    user: req.user, 
    message: 'Token is valid' 
  });
});

/**
 * GET /api/auth/role
 * Lấy role của user hiện tại từ Firestore
 */
router.get('/role', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { db } = await import('../config/firebase');
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    let role = userData?.role || null;

    // Normalize role cũ
    if (role === 'student') {
      role = 'candidate';
      await userDoc.ref.update({ role: 'candidate' });
    }

    // Ưu tiên admin nếu có flag isAdmin
    const isAdmin = userData?.isAdmin === true;
    if (isAdmin) {
      role = 'admin';
    }

    res.json({ role, isAdmin });
  } catch (error: any) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to get user role' });
  }
});

/**
 * POST /api/auth/sync
 * Đồng bộ thông tin user lên Firestore sau đăng ký/đăng nhập
 */
router.post('/sync', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { db } = await import('../config/firebase');
    const { uid, email, name, phone, role, photoURL } = req.body;

    if (!uid || !email) {
      res.status(400).json({ error: 'Missing required fields: uid, email' });
      return;
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    const userData = {
      email,
      name: name || null,
      phone: phone || null,
      role: role || 'candidate',
      photoURL: photoURL || null,
      updatedAt: new Date(),
    };

    if (userDoc.exists) {
      // Update existing user
      await userRef.update(userData);
    } else {
      // Create new user
      await userRef.set({
        ...userData,
        uid,
        createdAt: new Date(),
      });
    }

    res.json({ message: 'User synced successfully' });
  } catch (error: any) {
    console.error('Sync user error:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

/**
 * PATCH /api/auth/users/:userId/role
 * Update role của user (chỉ admin)
 */
router.patch('/users/:userId/role', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Admin permission required' });
      return;
    }

    const { userId } = req.params;
    const { role } = req.body;

    if (!['candidate', 'employer', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const { db } = await import('../config/firebase');
    await db.collection('users').doc(userId).update({ 
      role,
      updatedAt: new Date() 
    });

    res.json({ message: 'Role updated successfully' });
  } catch (error: any) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/auth/users/:userId
 * Xóa user (soft delete - đánh dấu deleted)
 */
router.delete('/users/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Only allow self-deletion or admin deletion
    if (req.user?.uid !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }

    const { db } = await import('../config/firebase');
    await db.collection('users').doc(userId).update({
      deleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;