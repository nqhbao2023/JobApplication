import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import notificationService from '../services/notification.service';

export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const notifications = await notificationService.getNotifications(userId, limit);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

