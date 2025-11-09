import { Platform } from 'react-native';

export const API_BASE_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:3000',  // ✅ Android Emulator
      ios: 'http://localhost:3000',     // ✅ iOS Simulator
      default: 'http://localhost:3000',
    })
  : 'https://your-production-api.onrender.com'; // TODO: Update khi deploy

export const API_ENDPOINTS = {
  // Jobs
  jobs: '/api/jobs',
  myJobs: '/api/jobs/my',

  // AI
  ai: {
    recommend: '/api/ai/recommend',
    enhance: '/api/ai/enhance-description',
    extractSkills: '/api/ai/extract-skills',
  },

  // Applications
  applications: {
    create: '/api/applications',
    my: '/api/applications/my',
    employer: '/api/applications/employer',
    byJob: (jobId: string) => `/api/applications/job/${jobId}`,
    updateStatus: (id: string) => `/api/applications/${id}/status`,
    withdraw: (id: string) => `/api/applications/${id}`,
  },

  // News
  news: '/api/news',

  // Auth
  auth: {
    verify: '/api/auth/verify',
    profile: '/api/auth/profile',
  },
};