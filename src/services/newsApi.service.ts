import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface NewsArticle {
  id?: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  category: string;
  publishedAt: any;
  createdAt: any;
}

export const newsApiService = {
  async getNews(limit: number = 20, category?: string): Promise<NewsArticle[]> {
    return apiClient.get<NewsArticle[]>(API_ENDPOINTS.news, { limit, category });
  },

  async refreshNews(): Promise<{ total: number; saved: number }> {
    return apiClient.post<{ total: number; saved: number }>(`${API_ENDPOINTS.news}/refresh`);
  },
};

