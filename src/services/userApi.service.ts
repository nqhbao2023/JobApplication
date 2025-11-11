import apiClient from './apiClient';
import type { AxiosResponse } from 'axios';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  role: 'candidate' | 'employer' | 'admin';
  skills?: string[];
  savedJobIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  phone?: string;
  skills?: string[];
  bio?: string;
}

class UserApiService {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.get('/api/users/me');
    return response.data;
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfilePayload): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.put('/api/users/me', data);
    return response.data;
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(fileUri: string, mimeType?: string): Promise<{ photoURL: string }> {
    const formData = new FormData();
    
    // Create file object from URI
    const filename = fileUri.split('/').pop() || 'avatar.jpg';
    formData.append('avatar', {
      uri: fileUri,
      type: mimeType || 'image/jpeg',
      name: filename,
    } as any);

    const response: AxiosResponse<{ photoURL: string }> = await apiClient.post('/api/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Get user by ID (for viewing other profiles)
   */
  async getUserById(userId: string): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.get(`/api/users/${userId}`);
    return response.data;
  }

  /**
   * Admin: Get all users
   */
  async getAllUsers(params?: {
    role?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const response: AxiosResponse<{ users: User[]; total: number; page: number; totalPages: number }> = await apiClient.get('/api/users', { params });
    return response.data;
  }

  /**
   * Admin: Create new user
   */
  async createUser(data: {
    email: string;
    password: string;
    displayName: string;
    role: 'candidate' | 'employer' | 'admin';
    phone?: string;
  }): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.post('/api/users', data);
    return response.data;
  }

  /**
   * Admin: Update user
   */
  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.put(`/api/users/${userId}`, data);
    return response.data;
  }

  /**
   * Admin: Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/api/users/${userId}`);
  }
}

export const userApiService = new UserApiService();
