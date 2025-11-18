import apiClient from './apiClient';
import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';
import { auth } from '@/config/firebase';
import { AppRole, AppRoleOrNull, StudentProfile } from '@/types';

/* -------------------------------------------------------------------------- */
/*                       🔐  Auth API service – Job4S                         */
/* -------------------------------------------------------------------------- */

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
  studentProfile?: StudentProfile;
}

export const authApiService = {
  /* ---------------------------------------------------------------------- */
  /* 🔑  Verify Firebase token với backend                                  */
  /* ---------------------------------------------------------------------- */
  async verifyToken(): Promise<AuthResponse | null> {
    try {
      const res = await apiClient.get<AuthResponse>(API_ENDPOINTS.auth.verify);
      return res; // apiClient đã unwrap .data
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.warn('⚠️ verifyToken: user not found → return null');
        return null;
      }
      console.error('❌ verifyToken error:', err.message);
      throw err;
    }
  },

  /* ---------------------------------------------------------------------- */
  /* 🛂  Lấy role hiện tại của user                                          */
  /* ---------------------------------------------------------------------- */
  async getCurrentRole(): Promise<RoleResponse> {
    try {
      const res = await apiClient.get<RoleResponse>(API_ENDPOINTS.auth.role);
      return res;
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.warn('⚠️ getCurrentRole: user not found → creating default profile');

        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          apiClient
            .post(API_ENDPOINTS.auth.sync, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'candidate',
            })
            .catch(console.error);
        }

        return { role: 'candidate', isAdmin: false };
      }
      
      // Chỉ log error khi KHÔNG phải 401 (401 là normal khi chưa login hoặc token hết hạn)
      if (!axios.isAxiosError(err) || err.response?.status !== 401) {
        console.error('❌ getCurrentRole error:', err.message);
      }
      throw err;
    }
  },

  /* ---------------------------------------------------------------------- */
  /* 🔄  Đồng bộ user sau đăng ký / đăng nhập                                */
  /* ---------------------------------------------------------------------- */
  async syncUser(userData: {
    uid: string;
    email: string;
    name?: string;
    phone?: string;
    role?: AppRole;
    photoURL?: string;
  }): Promise<void> {
    await apiClient.post<void>(API_ENDPOINTS.auth.sync, userData);
  },

  /* ---------------------------------------------------------------------- */
  /* 📝  Update role (admin)                                                 */
  /* ---------------------------------------------------------------------- */
  async updateRole(userId: string, role: AppRole): Promise<void> {
    await apiClient.patch<void>(`/api/auth/users/${userId}/role`, { role });
  },

  /* ---------------------------------------------------------------------- */
  /* 🗑   Xoá (soft-delete) tài khoản                                        */
  /* ---------------------------------------------------------------------- */
  async deleteAccount(userId: string): Promise<void> {
    await apiClient.delete<void>(`/api/auth/users/${userId}`);
  },

  /* ---------------------------------------------------------------------- */
  /* 👤  Lấy & cập nhật profile                                              */
  /* ---------------------------------------------------------------------- */
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(API_ENDPOINTS.auth.profile);
  },

  async updateProfile(updates: {
    name?: string;
    phone?: string;
    photoURL?: string;
    studentProfile?: StudentProfile;
  }): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(API_ENDPOINTS.auth.profile, updates);
  },
};
