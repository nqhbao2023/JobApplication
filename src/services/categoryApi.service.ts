import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface Category {
  $id: string;
  category_name?: string;
  icon_name?: string;
  color?: string;
}

export const categoryApiService = {
  async getAllCategories(limit?: number): Promise<Category[]> {
    const config = limit ? { params: { limit } } : undefined;
    return apiClient.get<Category[]>(API_ENDPOINTS.categories, config);
  },

  async getCategoryById(id: string): Promise<Category> {
    return apiClient.get<Category>(`${API_ENDPOINTS.categories}/${id}`);
  },
};

