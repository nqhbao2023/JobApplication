import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get API base URL based on environment
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable
 * 2. extra.apiUrl from app.json
 * 3. Production URL (if NODE_ENV !== 'development')
 * 4. Platform-specific localhost/emulator URLs
 */
const getBaseURL = (): string => {
  // ✅ 1. Ưu tiên biến môi trường Expo (cho phép config linh hoạt)
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl;
  
  if (envUrl) {
    console.log('🌐 Using API URL from environment:', envUrl);
    return envUrl;
  }

  // ✅ 2. Production mode → dùng Render URL
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    console.log('🌐 Using production API URL');
    return 'https://job4s-api.onrender.com';
  }

  // ✅ 3. Development fallback - Tự động dùng Expo debugger host
  // Expo tự detect IP của máy tính đang chạy Metro bundler
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  
  if (debuggerHost && debuggerHost !== 'localhost') {
    const autoUrl = `http://${debuggerHost}:3000`;
    console.log('🌐 Auto-detected API URL from Expo:', autoUrl);
    return autoUrl;
  }

  // ✅ 4. Fallback cuối cùng cho emulator/simulator
  const devUrl = Platform.select({
    android: 'http://10.0.2.2:3000',      // Android emulator loopback
    ios: 'http://localhost:3000',         // iOS simulator
    default: 'http://localhost:3000',
  }) as string;

  console.log('🌐 Using fallback API URL:', devUrl);
  return devUrl;
};

export const API_BASE_URL = getBaseURL();

export const API_ENDPOINTS = {
  health: '/health',
  jobs: '/api/jobs',
  myJobs: '/api/jobs/my-jobs',
  companies: '/api/companies',
  categories: '/api/categories',
  notifications: {
    unreadCount: '/api/notifications/unread-count',
    list: '/api/notifications',
  },
  ai: {
    recommend: '/api/ai/recommend',
    enhance: '/api/ai/enhance-description',
    extractSkills: '/api/ai/extract-skills',
  },
  news: '/api/news',
  applications: {
    create: '/api/applications',
    my: '/api/applications/my-applications',
    employer: '/api/applications/employer-applications',
    byJob: (jobId: string) => `/api/applications/job/${jobId}`,
    update: (id: string) => `/api/applications/${id}`,
    updateStatus: (id: string) => `/api/applications/${id}/status`,
    withdraw: (id: string) => `/api/applications/${id}`,
  },
  auth: {
    verify: '/api/auth/verify',
    role: '/api/auth/role',
    sync: '/api/auth/sync',
    profile: '/api/auth/profile',
  },
};
