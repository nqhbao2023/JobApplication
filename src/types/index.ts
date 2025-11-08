export type AppRole = 'candidate' | 'employer' | 'admin';
export type AppRoleOrNull = AppRole | null;

export * from './auth.types';

// Re-export types from types/type.tsx for backward compatibility
export type {
  Job,
  JobType,
  JobCategory,
  User,
  Company,
  Message,
} from '../../types/type';