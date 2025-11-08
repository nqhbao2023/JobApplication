export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://job4s-api.onrender.com';

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  jobs: `${API_BASE_URL}/api/jobs`,
  myJobs: `${API_BASE_URL}/api/jobs/my-jobs`,
  ai: {
    recommend: `${API_BASE_URL}/api/ai/recommend`,
    enhance: `${API_BASE_URL}/api/ai/enhance-description`,
    extractSkills: `${API_BASE_URL}/api/ai/extract-skills`,
  },
  news: `${API_BASE_URL}/api/news`,
  applications: {
    create: `${API_BASE_URL}/api/applications`,
    my: `${API_BASE_URL}/api/applications/my-applications`,
    employer: `${API_BASE_URL}/api/applications/employer-applications`,
    byJob: (jobId: string) => `${API_BASE_URL}/api/applications/job/${jobId}`,
    updateStatus: (id: string) => `${API_BASE_URL}/api/applications/${id}/status`,
    withdraw: (id: string) => `${API_BASE_URL}/api/applications/${id}`,
  },
  auth: {
    verify: `${API_BASE_URL}/api/auth/verify`,
  },
};

