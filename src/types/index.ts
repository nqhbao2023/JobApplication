export type AppRole = 'candidate' | 'employer' | 'admin';
export type AppRoleOrNull = AppRole | null;

export * from './auth.types';

// Re-export types from types/type.tsx for backward compatibility
export type {
  JobType,
  JobCategory,
  User,
  Message,
} from '../../types/type';

// Salary types
export interface SalaryObject {
  min?: number;
  max?: number;
  currency?: string;
}

export type SalaryValue = string | SalaryObject | null | undefined;

// Enhanced Job type with SalaryValue
export interface Job {
  $id: string;
  id?: string;
  title?: string;
  image?: string;
  created_at?: string;
  createdAt?: string;
  company?: string | { $id?: string; corp_name?: string; nation?: string };
  jobCategories?: any;
  type?: string;
  salary?: SalaryValue;
  location?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  status?: 'active' | 'closed' | 'draft';
}

// Enhanced Company type
export interface Company {
  $id: string;
  corp_name?: string;
  nation?: string;
  corp_description?: string;
  city?: string;
  image?: string;
  color?: string;
}

// Enhanced Category type
export interface Category {
  $id: string;
  category_name?: string;
  icon_name?: string;
  color?: string;
}