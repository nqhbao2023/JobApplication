import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';
import { AppRole, AppRoleOrNull } from '@/types';

/**
 * 🔐 Auth API Service
 * Xử lý toàn bộ authentication qua backend API thay vì Firebase client SDK
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: AppRole;
}

export interface AuthResponse {
  user: {
    uid: string;
    email: string;
    name: string;
    role: AppRoleOrNull;
    phone?: string;
    photoURL?: string;
  };
  token: string;
}

export interface RoleResponse {
  role: AppRoleOrNull;
  isAdmin: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  photoURL: string | null;
  role: AppRoleOrNull;
  createdAt: string | null;
  updatedAt: string | null;
}

export const authApiService = {
  /**
   * Xác thực token hiện tại với backend
   * Backend sẽ verify Firebase token và trả về thông tin user
   */
  async verifyToken(): Promise<AuthResponse> {
    return apiClient.get<AuthResponse>(API_ENDPOINTS.auth.verify);
  },

  /**
   * Lấy thông tin role của user hiện tại từ backend
   * Backend đọc từ Firestore và normalize role
   */
  async getCurrentRole(): Promise<RoleResponse> {
    return apiClient.get<RoleResponse>('/api/auth/role');
  },

  /**
   * Đồng bộ thông tin user lên backend sau khi đăng ký/đăng nhập
   * Backend sẽ lưu/update vào Firestore
   */
  async syncUser(userData: {
    uid: string;
    email: string;
    name?: string;
    phone?: string;
    role?: AppRole;
    photoURL?: string;
  }): Promise<void> {
    return apiClient.post<void>('/api/auth/sync', userData);
  },

  /**
   * Update role của user (chỉ admin có thể gọi)
   */
  async updateRole(userId: string, role: AppRole): Promise<void> {
    return apiClient.patch<void>(`/api/auth/users/${userId}/role`, { role });
  },

  /**
   * Xóa tài khoản user (soft delete)
   */
  async deleteAccount(userId: string): Promise<void> {
    return apiClient.delete<void>(`/api/auth/users/${userId}`);
  },

  /**
   * Get user profile trực tiếp từ backend
   */
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(API_ENDPOINTS.auth.profile);
  },

  /**
   * Update user profile và trả về dữ liệu mới nhất
   */
  async updateProfile(updates: {
    name?: string;
    phone?: string;
    photoURL?: string;
  }): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(API_ENDPOINTS.auth.profile, updates);
  },
};
