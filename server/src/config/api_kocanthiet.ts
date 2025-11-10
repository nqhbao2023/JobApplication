//server/src/config/api.ts
const isDev = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDev
  ? 'http://10.0.2.2:3000'
  : 'https://job4s-api.onrender.com';

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
};