import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { auth } from '@/config/firebase';
import { API_BASE_URL } from '@/config/api';

// Extend AxiosRequestConfig
declare module 'axios' {
  export interface AxiosRequestConfig {
    __retryCount?: number;
    __skipAuth?: boolean;
  }
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Auto attach Firebase token
client.interceptors.request.use(
  async (config) => {
    if (config.__skipAuth) return config;

    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.error('❌ Token refresh failed:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Retry logic & token refresh
// Note: Error messages are handled by errorHandler utility
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig;
    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;

    // Network errors - Retry up to 3 times with exponential backoff
    if (error.code === 'ECONNABORTED' || !error.response) {
      if (config.__retryCount >= 3) {
        // Max retries reached - reject with original error
        // Error message will be handled by errorHandler utility
        return Promise.reject(error);
      }

      config.__retryCount++;
      const delay = 1000 * config.__retryCount;
      await new Promise((r) => setTimeout(r, delay));
      return client(config);
    }

    // 401 Unauthorized - Token expired, try refresh once
    if (error.response?.status === 401 && config.__retryCount === 0) {
      config.__retryCount++;
      try {
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken(true);
          config.headers!.Authorization = `Bearer ${newToken}`;
          return client(config);
        }
      } catch (refreshErr: any) {
        // Only force logout if it's NOT a network error
        if (refreshErr?.code !== 'auth/network-request-failed') {
          console.error('❌ Token refresh failed (auth error), forcing logout');
          await auth.signOut();
        } else {
          console.warn('⚠️ Network error during token refresh, will retry later');
        }
        return Promise.reject(error);
      }
    }

    // For all other errors, reject with original error
    // Error messages will be extracted and displayed by errorHandler utility
    return Promise.reject(error);
  }
);

export default {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    client.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    client.post<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    client.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    client.delete<T>(url, config).then((res) => res.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    client.put<T>(url, data, config).then((res) => res.data),
};