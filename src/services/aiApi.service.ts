import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface AIRecommendation {
  jobId: string;
  score: number;
  reason: string;
  matchedSkills: string[];
}

export interface CVAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}

export interface SalaryPrediction {
  min: number;
  max: number;
  avg: number;
  unit: string;
  confidence: string;
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

  async askAI(prompt: string): Promise<string> {
    const response = await apiClient.post<{ answer: string }>(
      API_ENDPOINTS.ai.ask,
      { prompt }
    );
    return response.answer;
  },

  async categorizeJob(title: string, description: string): Promise<string> {
    const response = await apiClient.post<{ category: string }>(
      API_ENDPOINTS.ai.categorize,
      { title, description }
    );
    return response.category;
  },

  async analyzeCV(cvData: {
    education?: string;
    experience?: string;
    skills?: string[];
    projects?: string;
    summary?: string;
  }): Promise<CVAnalysis> {
    const response = await apiClient.post<CVAnalysis>(
      API_ENDPOINTS.ai.analyzeCV,
      cvData
    );
    return response;
  },

  async predictSalary(jobData: {
    title: string;
    category: string;
    location: string;
    type: 'part-time' | 'full-time' | 'internship' | 'freelance';
  }): Promise<SalaryPrediction | null> {
    const response = await apiClient.post<SalaryPrediction | null>(
      API_ENDPOINTS.ai.predictSalary,
      jobData
    );
    return response;
  },
};
