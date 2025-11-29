import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface Notification {
  $id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  type?: string;
}

export const notificationApiService = {
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>(API_ENDPOINTS.notifications.unreadCount);
    return response.count;
  },

  async getNotifications(limit?: number): Promise<Notification[]> {
    const config = limit ? { params: { limit } } : undefined;
    return apiClient.get<Notification[]>(API_ENDPOINTS.notifications.list, config);
  },
};

