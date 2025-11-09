import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface NewsArticle {
  id?: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  category: string;
  publishedAt: Date | string | number;
  createdAt: Date | string | number;
}

export const newsApiService = {
  async getNews(limit: number = 20, category?: string): Promise<NewsArticle[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (category) params.append('category', category);
    return apiClient.get<NewsArticle[]>(`${API_ENDPOINTS.news}?${params.toString()}`);
  },

  async refreshNews(): Promise<{ total: number; saved: number }> {
    return apiClient.post<{ total: number; saved: number }>(`${API_ENDPOINTS.news}/refresh`);
  },
};

