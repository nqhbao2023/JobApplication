import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface AIRecommendation {
  jobId: string;
  score: number;
  reason: string;
  matchedSkills: string[];
}

export const aiApiService = {
  async getRecommendations(limit: number = 10): Promise<AIRecommendation[]> {
    return apiClient.get<AIRecommendation[]>(`${API_ENDPOINTS.ai.recommend}?limit=${limit}`);
  },

  async enhanceDescription(description: string): Promise<string> {
    const response = await apiClient.post<{ enhanced: string }>(
      API_ENDPOINTS.ai.enhance,
      { description }
    );
    return response.enhanced;
  },

  async extractSkills(text: string): Promise<string[]> {
    const response = await apiClient.post<{ skills: string[] }>(
      API_ENDPOINTS.ai.extractSkills,
      { text }
    );
    return response.skills;
  },
};

