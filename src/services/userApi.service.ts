import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';
import { AppRole } from '@/types';

export interface UserProfile {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  role: AppRole;
  skills?: string[];
  savedJobIds?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UserProfileResponse extends UserProfile {
  shouldRefreshToken?: boolean;
}

export const userApiService = {
  async getCurrentUser(): Promise<UserProfileResponse> {
    return apiClient.get<UserProfileResponse>(API_ENDPOINTS.users.me);
  },

  async bootstrapProfile(data: {
    name: string;
    phone: string;
    role: AppRole | 'student';
  }): Promise<UserProfileResponse> {
    return apiClient.post<UserProfileResponse>(API_ENDPOINTS.users.bootstrap, data);
  },
};
