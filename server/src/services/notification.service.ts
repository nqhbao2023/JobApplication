import { db } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';

const NOTIFICATIONS_COLLECTION = 'notifications';

export interface Notification {
  $id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  type?: string;
}

export class NotificationService {
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const snapshot = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      return snapshot.size;
    } catch (error: any) {
      throw new AppError(`Failed to fetch unread count: ${error.message}`, 500);
    }
  }

  async getNotifications(userId: string, limit?: number): Promise<Notification[]> {
    try {
      let query = db
        .collection(NOTIFICATIONS_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc');

      if (limit) {
        query = query.limit(limit) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        $id: doc.id,
        ...doc.data(),
      })) as Notification[];
    } catch (error: any) {
      throw new AppError(`Failed to fetch notifications: ${error.message}`, 500);
    }
  }
}

export default new NotificationService();

