import { Request, Response } from 'express';
import { userService } from '../services/user.service';

export const userController = {
  /**
   * GET /api/users/me
   * Get current user profile
   */
  async getMe(req: Request, res: Response) {
    try {
      const userId = req.user!.uid;
      const user = await userService.getUserById(userId);
      return res.json(user);
    } catch (error: any) {
      console.error('Get me error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * PUT /api/users/me
   * Update current user profile
   */
  async updateMe(req: Request, res: Response) {
    try {
      const userId = req.user!.uid;
      const updates = req.body;
      const user = await userService.updateUser(userId, updates);
      return res.json(user);
    } catch (error: any) {
      console.error('Update me error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/users/me/avatar
   * Upload user avatar
   */
  async uploadAvatar(req: Request, res: Response) {
    try {
      console.log('📥 Upload avatar request received');
      console.log('👤 User ID:', req.user?.uid);
      console.log('📁 File:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'NO FILE');
      
      const userId = req.user!.uid;
      const file = req.file;
      
      if (!file) {
        console.error('❌ No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('🚀 Calling userService.uploadAvatar...');
      const photoURL = await userService.uploadAvatar(userId, file);
      
      console.log('✅ Upload successful, returning:', { photoURL });
      return res.json({ photoURL });
    } catch (error: any) {
      console.error('❌ Upload avatar controller error:', error);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/users/:userId
   * Get user by ID
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);
      return res.json(user);
    } catch (error: any) {
      console.error('Get user by ID error:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/users
   * Get all users (admin only)
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const { role, page = '1', limit = '20', search } = req.query;
      
      const result = await userService.getAllUsers({
        role: role as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        search: search as string,
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error('Get all users error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/users
   * Create new user (admin only)
   */
  async createUser(req: Request, res: Response) {
    try {
      const user = await userService.createUser(req.body);
      return res.status(201).json(user);
    } catch (error: any) {
      console.error('Create user error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * PUT /api/users/:userId
   * Update user (admin only)
   */
  async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const updates = req.body;
      const user = await userService.updateUser(userId, updates);
      return res.json(user);
    } catch (error: any) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * DELETE /api/users/:userId
   * Delete user (admin only)
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      await userService.deleteUser(userId);
      return res.status(204).send();
    } catch (error: any) {
      console.error('Delete user error:', error);
      return res.status(500).json({ error: error.message });
    }
  },
};
