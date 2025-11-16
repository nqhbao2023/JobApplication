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
  $id: string;  // ✅ Required: normalizeJob always provides this
  id?: string;
  title?: string;
  image?: string;
  created_at?: string;
  createdAt?: string;
  company?: string | { $id?: string; corp_name?: string; nation?: string; city?: string; email?: string };
  jobCategories?: any;
  type?: string;
  salary?: SalaryValue;
  location?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  status?: 'active' | 'closed' | 'draft' | 'inactive';
  employerId?: string;  // ✅ Added to match server type
  ownerId?: string;     // ✅ Legacy field support (some jobs might use this)
  applicantCount?: number;
  viewCount?: number;
  
  // ✅ Legacy fields from types/type.tsx (for backward compatibility)
  skills_required?: string;
  responsibilities?: string;
  updated_at?: string;
  jobTypes?: any;
  users?: any;
  job_Description?: string;
  
  // ✅ NEW PLAN: Job Aggregator Fields
  source?: 'viecoi' | 'internal' | 'quick-post'; // Source of the job (viecoi crawler, internal posting, or quick-post)
  external_url?: string; // Original URL if crawled from external source
  jobSource?: 'crawled' | 'quick-post' | 'featured'; // Legacy/alternative field for job source type
  sourceUrl?: string; // Legacy/alternative field for URL gốc nếu crawled
  contactInfo?: {
    phone?: string;
    zalo?: string;
    facebook?: string;
    email?: string;
  };
  is_verified?: boolean; // Snake case to match Firestore
  isVerified?: boolean; // Camel case for frontend
  isFeatured?: boolean;
  workSchedule?: string;
  hourlyRate?: number;
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