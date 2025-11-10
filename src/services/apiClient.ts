import axios, { AxiosInstance, AxiosError } from 'axios';
import { auth } from '@/config/firebase';
import { API_BASE_URL } from '@/config/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    console.log('🌐 API_BASE_URL:', API_BASE_URL);
    
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async (config) => {
        const url = `${config.baseURL || ''}${config.url || ''}`;
        console.log('📤', config.method?.toUpperCase(), url);
        
        try {
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('❌ Auth token failed:', error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log('✅', response.status, response.config.url);
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          console.error('❌ API Error:', error.response.status, error.config?.url);
        } else if (error.request) {
          const url = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
          console.error('❌ Network Error:', url);
        } else {
          console.error('❌ Config Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export default new APIClient();