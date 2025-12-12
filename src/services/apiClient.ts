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
  timeout: 60000, // Increased to 60s for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: function(status) { return status >= 200 && status < 300; },
});

// Helper to get token with graceful error handling
var getAuthToken = async function(): Promise<string | null> {
  var user = auth.currentUser;
  if (!user) return null;
  
  try {
    var token = await user.getIdToken(false);
    return token;
  } catch (err: any) {
    if (err?.code === 'auth/network-request-failed') {
      console.warn('[apiClient] Network error getting token');
      return null;
    }
    
    try {
      var refreshedToken = await user.getIdToken(true);
      return refreshedToken;
    } catch (refreshErr: any) {
      if (refreshErr?.code !== 'auth/network-request-failed') {
        console.error('[apiClient] Token refresh failed:', refreshErr?.code || refreshErr?.message);
      }
      return null;
    }
  }
};

// Request interceptor - Auto attach Firebase token
client.interceptors.request.use(
  async function(config) {
    if (config.__skipAuth) return config;

    var token = await getAuthToken();
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  },
  function(error) { return Promise.reject(error); }
);

// Response interceptor - Retry logic
client.interceptors.response.use(
  function(response) {
    var contentType = response.headers['content-type'];
    if (contentType && !contentType.includes('application/json') && typeof response.data === 'string') {
      console.warn('[apiClient] Received non-JSON response');
    }
    return response;
  },
  async function(error: AxiosError) {
    var config = error.config as AxiosRequestConfig;
    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;

    // Network errors - Retry up to 3 times
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
      if (config.__retryCount >= 3) {
        var networkError = new Error('Cannot connect to server. Please check your network.');
        (networkError as any).code = 'NETWORK_ERROR';
        (networkError as any).originalError = error;
        return Promise.reject(networkError);
      }

      config.__retryCount++;
      var delay = 1000 * config.__retryCount;
      console.log('[apiClient] Retry ' + config.__retryCount + '/3 after ' + delay + 'ms');
      await new Promise(function(r) { setTimeout(r, delay); });
      return client(config);
    }

    // 401 Unauthorized - Token expired
    if (error.response?.status === 401 && config.__retryCount === 0) {
      config.__retryCount++;
      try {
        var user = auth.currentUser;
        if (user) {
          var newToken = await user.getIdToken(true);
          config.headers!.Authorization = 'Bearer ' + newToken;
          return client(config);
        }
      } catch (refreshErr: any) {
        if (refreshErr?.code !== 'auth/network-request-failed') {
          console.error('[apiClient] Token refresh failed, forcing logout');
          await auth.signOut();
        } else {
          console.warn('[apiClient] Network error during token refresh');
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default {
  get: function<T>(url: string, config?: AxiosRequestConfig) {
    return client.get<T>(url, config).then(function(res) { return res.data; });
  },

  post: function<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return client.post<T>(url, data, config).then(function(res) { return res.data; });
  },

  patch: function<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return client.patch<T>(url, data, config).then(function(res) { return res.data; });
  },

  delete: function<T>(url: string, config?: AxiosRequestConfig) {
    return client.delete<T>(url, config).then(function(res) { return res.data; });
  },

  put: function<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return client.put<T>(url, data, config).then(function(res) { return res.data; });
  },
};
