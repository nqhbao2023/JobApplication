import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { Response } from 'express';

const router = Router();
const buildProfileResponse = (
  uid: string,
  userData: any,
  fallbackEmail?: string
) => ({
  uid,
  email: userData?.email || fallbackEmail || null,
  name: userData?.name || null,
  phone: userData?.phone || null,
  photoURL: userData?.photoURL || null,
  role: userData?.role || 'candidate',
  createdAt: userData?.createdAt || null,
  updatedAt: userData?.updatedAt || null,
});
/**
 * GET /api/auth/verify
 * Xác thực token hiện tại
 */
router.get('/verify', authLimiter, authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    user: req.user,
    message: 'Token is valid',
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
 * GET /api/auth/profile
 * Lấy thông tin profile của user hiện tại
 */
router.get('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { db } = await import('../config/firebase');
    const userDoc = await db.collection('users').doc(req.user!.uid).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();

    // Check if user is soft-deleted
    if (userData?.deleted === true) {
      res.status(410).json({ error: 'User has been deleted' });
      return;
    }

    // Filter sensitive data

    const profile = buildProfileResponse(req.user!.uid, userData, req.user!.email);
    res.json(profile);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

/**
 * PATCH /api/auth/profile
 * Update thông tin profile của user hiện tại
 */
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, photoURL } = req.body;
    const { db } = await import('../config/firebase');

    const updates: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (photoURL !== undefined) updates.photoURL = photoURL;

    await db.collection('users').doc(req.user!.uid).update(updates);

    const updatedDoc = await db.collection('users').doc(req.user!.uid).get();
    const profile = buildProfileResponse(req.user!.uid, updatedDoc.data(), req.user!.email);

    res.json(profile);  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
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
      updatedAt: new Date(),
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