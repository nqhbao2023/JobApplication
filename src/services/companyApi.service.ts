import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface Company {
  $id: string;
  corp_name?: string;
  nation?: string;
  corp_description?: string;
  city?: string;
  image?: string;
  color?: string;
}

export const companyApiService = {
  async getAllCompanies(limit?: number): Promise<Company[]> {
    const params = limit ? { limit } : undefined;
    return apiClient.get<Company[]>(API_ENDPOINTS.companies, params);
  },

  async getCompanyById(id: string): Promise<Company> {
    return apiClient.get<Company>(`${API_ENDPOINTS.companies}/${id}`);
  },
};

