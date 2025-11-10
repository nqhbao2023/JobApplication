import { Platform } from 'react-native';

const getBaseURL = (): string => {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) {
    return 'https://job4s-api.onrender.com';
  }

  if (Platform.OS === 'android') {
    return 'http://192.168.1.58:3000';
  }
  
  return 'http://localhost:3000';
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
    updateStatus: (id: string) => `/api/applications/${id}/status`,
    withdraw: (id: string) => `/api/applications/${id}`,
  },
  auth: {
    verify: '/api/auth/verify',
  },
  users: {
    me: '/api/users/me',
    bootstrap: '/api/users/bootstrap',
  },
  savedJobs: {
    list: '/api/saved-jobs',
    save: (jobId: string) => `/api/saved-jobs/${jobId}`,
    remove: (jobId: string) => `/api/saved-jobs/${jobId}`,
  },
};