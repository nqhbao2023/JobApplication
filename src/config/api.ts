import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get API base URL based on environment
 * 
 * Priority order:
 * 1. EXPO_PUBLIC_API_URL environment variable (explicit override)
 * 2. extra.apiUrl from app.json (build-time config)
 * 3. Auto-detect from Expo hostUri (development mode)
 * 4. Production URL (for release builds)
 * 5. Platform-specific fallback (emulator/simulator)
 */

// Cache for API URL to avoid re-detection
let cachedApiUrl: string | null = null;

const getBaseURL = (): string => {
  // Return cached URL if available
  if (cachedApiUrl) {
    return cachedApiUrl;
  }
  
  // ✅ 1. Check explicit environment variable first
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '' && envUrl.startsWith('http')) {
    console.log('🌐 Using API URL from env:', envUrl);
    cachedApiUrl = envUrl;
    return envUrl;
  }

  // ✅ 2. Check app.json extra config
  const configUrl = (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl;
  if (configUrl && configUrl.trim() !== '' && configUrl.startsWith('http')) {
    console.log('🌐 Using API URL from config:', configUrl);
    cachedApiUrl = configUrl;
    return configUrl;
  }

  // ✅ 3. Auto-detect from Expo Metro bundler (most reliable for dev)
  // This works with both physical devices and emulators
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  
  if (hostUri) {
    // Extract IP from hostUri (format: "192.168.1.47:8081" or "192.168.1.47:19000")
    const host = hostUri.split(':')[0];
    
    // Make sure it's a valid IP (not localhost)
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      const autoUrl = `http://${host}:3000`;
      console.log('🌐 Auto-detected API URL from Metro:', autoUrl);
      cachedApiUrl = autoUrl;
      return autoUrl;
    }
  }

  // ✅ 4. Production mode - use deployed server
  const isDev = process.env.NODE_ENV === 'development' || __DEV__;
  if (!isDev) {
    const prodUrl = 'https://job4s-server.onrender.com';
    console.log('🌐 Using production API URL:', prodUrl);
    cachedApiUrl = prodUrl;
    return prodUrl;
  }

  // ✅ 5. Fallback for emulator/simulator
  const fallbackUrl = Platform.select({
    android: 'http://10.0.2.2:3000',      // Android emulator loopback to host machine
    ios: 'http://localhost:3000',          // iOS simulator shares host network
    default: 'http://localhost:3000',
  }) as string;

  console.log('🌐 Using fallback API URL:', fallbackUrl);
  cachedApiUrl = fallbackUrl;
  return fallbackUrl;
};

// Helper to clear cache (useful for testing or reconnection)
export const clearApiUrlCache = () => {
  cachedApiUrl = null;
};

// Helper to get current cached URL
export const getCurrentApiUrl = () => cachedApiUrl;

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
    ask: '/api/ai/ask',
    categorize: '/api/ai/categorize',
    analyzeCV: '/api/ai/analyze-cv',
    predictSalary: '/api/ai/predict-salary',
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
    delete: (id: string) => `/api/applications/${id}/permanent`,
  },
  auth: {
    verify: '/api/auth/verify',
    role: '/api/auth/role',
    sync: '/api/auth/sync',
    profile: '/api/auth/profile',
    // OTP endpoints
    sendOTP: '/api/auth/send-otp',
    verifyOTP: '/api/auth/verify-otp',
    resetPassword: '/api/auth/reset-password',
    checkOTPStatus: '/api/auth/check-otp-status',
    consumeOTP: '/api/auth/consume-otp',
  },
};
