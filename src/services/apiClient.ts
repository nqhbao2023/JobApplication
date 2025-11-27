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
  timeout: 20000, // Increased timeout for slower connections
  headers: {
    'Content-Type': 'application/json',
  },
  // Validate response status to handle non-JSON responses
  validateStatus: (status) => status >= 200 && status < 300,
});

// Helper to get token with graceful error handling
const getAuthToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    // Try to get cached token first (don't force refresh)
    const token = await user.getIdToken(false);
    return token;
  } catch (err: any) {
    // If network error, don't force logout - just skip auth for this request
    if (err?.code === 'auth/network-request-failed') {
      console.warn('⚠️ Network error getting token, proceeding without auth');
      return null;
    }
    
    // For other errors, try once more with force refresh
    try {
      const token = await user.getIdToken(true);
      return token;
    } catch (refreshErr: any) {
      if (refreshErr?.code !== 'auth/network-request-failed') {
        console.error('❌ Token refresh failed:', refreshErr?.code || refreshErr?.message);
      }
      return null;
    }
  }
};

// Request interceptor - Auto attach Firebase token
client.interceptors.request.use(
  async (config) => {
    if (config.__skipAuth) return config;

    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Retry logic & better error handling
client.interceptors.response.use(
  (response) => {
    // Validate that response is JSON if expected
    const contentType = response.headers['content-type'];
    if (contentType && !contentType.includes('application/json') && typeof response.data === 'string') {
      // Non-JSON response - might be HTML error page
      console.warn('⚠️ Received non-JSON response');
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig;
    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;

    // Network errors - Retry up to 3 times with exponential backoff
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
      if (config.__retryCount >= 3) {
        // Max retries reached - reject with descriptive error
        const networkError = new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
        (networkError as any).code = 'NETWORK_ERROR';
        (networkError as any).originalError = error;
        return Promise.reject(networkError);
      }

      config.__retryCount++;
      const delay = 1000 * config.__retryCount; // 1s, 2s, 3s
      console.log(`🔄 Retry ${config.__retryCount}/3 after ${delay}ms...`);
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