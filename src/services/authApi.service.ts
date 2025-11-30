import apiClient from './apiClient';
import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';
import { auth } from '@/config/firebase';
import { AppRole, AppRoleOrNull, StudentProfile } from '@/types';

// Auth API service - Job4S

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
  skills?: string[]; // ✅ Add skills for AI recommendations
  createdAt: string | null;
  updatedAt: string | null;
  studentProfile?: StudentProfile;
}

// OTP Response Types
export interface OTPResponse {
  success: boolean;
  message?: string;
  error?: string;
  cooldownRemaining?: number;
  verified?: boolean;
}

export const authApiService = {
  // Verify Firebase token with backend
  async verifyToken(): Promise<AuthResponse | null> {
    try {
      const res = await apiClient.get<AuthResponse>(API_ENDPOINTS.auth.verify);
      return res;
    } catch (err: any) {
      if (err?.code === 'ECONNABORTED' || !err?.response) {
        console.warn('verifyToken: Network error, will retry later');
        return null;
      }
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.warn('verifyToken: user not found, return null');
        return null;
      }
      console.error('verifyToken error:', err.message);
      throw err;
    }
  },

  // Get current user role
  async getCurrentRole(): Promise<RoleResponse> {
    try {
      const res = await apiClient.get<RoleResponse>(API_ENDPOINTS.auth.role);
      return res;
    } catch (err: any) {
      // Handle network/connection errors
      if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || !err?.response) {
        console.warn('getCurrentRole: Network error, using default role');
        return { role: 'candidate', isAdmin: false };
      }
      
      // Handle JSON parse errors
      const errorName = String(err?.name || '');
      const errorMsg = String(err?.message || '');
      if (errorName === 'SyntaxError' || errorMsg.indexOf('SyntaxError') >= 0) {
        console.warn('getCurrentRole: Invalid response format, using default role');
        return { role: 'candidate', isAdmin: false };
      }
      
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.warn('getCurrentRole: user not found, creating default profile');

        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          apiClient
            .post(API_ENDPOINTS.auth.sync, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'candidate',
            })
            .catch(function() {});
        }

        return { role: 'candidate', isAdmin: false };
      }
      
      // 401 is normal when not logged in
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return { role: null, isAdmin: false };
      }
      
      console.error('getCurrentRole error:', err.message);
      throw err;
    }
  },

  // Sync user after register/login
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

  // Update role (admin)
  async updateRole(userId: string, role: AppRole): Promise<void> {
    await apiClient.patch<void>('/api/auth/users/' + userId + '/role', { role });
  },

  // Delete account
  async deleteAccount(userId: string): Promise<void> {
    await apiClient.delete<void>('/api/auth/users/' + userId);
  },

  // Get profile
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(API_ENDPOINTS.auth.profile);
  },

  // Update profile
  async updateProfile(updates: {
    name?: string;
    phone?: string;
    photoURL?: string;
    studentProfile?: StudentProfile;
  }): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(API_ENDPOINTS.auth.profile, updates);
  },

  // ===== OTP Methods =====

  /**
   * Send OTP to email for verification or password reset
   */
  async sendOTP(
    email: string,
    purpose: 'email_verification' | 'password_reset'
  ): Promise<OTPResponse> {
    try {
      const response = await apiClient.post<OTPResponse>(API_ENDPOINTS.auth.sendOTP, {
        email,
        purpose,
      });
      return response;
    } catch (err: any) {
      if (err?.response?.data) {
        return {
          success: false,
          error: err.response.data.error || 'Không thể gửi mã OTP',
          cooldownRemaining: err.response.data.cooldownRemaining,
        };
      }
      return {
        success: false,
        error: err?.message || 'Đã xảy ra lỗi khi gửi mã OTP',
      };
    }
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(
    email: string,
    code: string,
    purpose: 'email_verification' | 'password_reset'
  ): Promise<OTPResponse> {
    try {
      const response = await apiClient.post<OTPResponse>(API_ENDPOINTS.auth.verifyOTP, {
        email,
        code,
        purpose,
      });
      return response;
    } catch (err: any) {
      if (err?.response?.data) {
        return {
          success: false,
          error: err.response.data.error || 'Mã OTP không chính xác',
        };
      }
      return {
        success: false,
        error: err?.message || 'Đã xảy ra lỗi khi xác thực OTP',
      };
    }
  },

  /**
   * Reset password after OTP verification
   */
  async resetPassword(email: string, newPassword: string): Promise<OTPResponse> {
    try {
      const response = await apiClient.post<OTPResponse>(API_ENDPOINTS.auth.resetPassword, {
        email,
        newPassword,
      });
      return response;
    } catch (err: any) {
      if (err?.response?.data) {
        return {
          success: false,
          error: err.response.data.error || 'Không thể đặt lại mật khẩu',
        };
      }
      return {
        success: false,
        error: err?.message || 'Đã xảy ra lỗi khi đặt lại mật khẩu',
      };
    }
  },

  /**
   * Check if OTP is verified
   */
  async checkOTPStatus(
    email: string,
    purpose: 'email_verification' | 'password_reset'
  ): Promise<{ success: boolean; verified: boolean }> {
    try {
      const response = await apiClient.post<{ success: boolean; verified: boolean }>(
        API_ENDPOINTS.auth.checkOTPStatus,
        { email, purpose }
      );
      return response;
    } catch (err: any) {
      return { success: false, verified: false };
    }
  },

  /**
   * Consume OTP after successful action
   */
  async consumeOTP(
    email: string,
    purpose: 'email_verification' | 'password_reset'
  ): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        API_ENDPOINTS.auth.consumeOTP,
        { email, purpose }
      );
      return response;
    } catch (err: any) {
      return { success: false };
    }
  },
};
