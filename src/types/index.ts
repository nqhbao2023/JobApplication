export type AppRole = 'candidate' | 'employer' | 'admin';
export type AppRoleOrNull = AppRole | null;

export * from './auth.types';

// Salary types
export interface SalaryObject {
  min?: number;
  max?: number;
  currency?: string;
}

export type SalaryValue = string | SalaryObject | null | undefined;

// ✅ Core types (moved from types/type.tsx)
export interface JobType {
  $id: string;
  type_name: string;
}

export interface JobCategory {
  $id: string;
  category_name: string;
  icon_name: string;
  color: string;
}

export interface User {
  $id: string;
  name: string;
  email: string;
  phone?: string;
  isAdmin?: boolean;
  id_image?: string;
  isRecruiter?: boolean;
  studentProfile?: StudentProfile; // ✅ NEW: Student-specific profile data
}

// ✅ NEW PLAN: Student Profile for Job Matching
export interface StudentProfile {
  // Schedule preferences
  availableDays?: string[]; // e.g., ['monday', 'wednesday', 'friday']
  availableTimeSlots?: {
    morning?: boolean;    // 6h-12h
    afternoon?: boolean;  // 12h-18h
    evening?: boolean;    // 18h-22h
    lateNight?: boolean;  // 22h-6h
    weekend?: boolean;    // Thứ 7, CN
  };
  
  // Location preferences
  schoolLocation?: {
    latitude: number;
    longitude: number;
    address?: string; // e.g., "Đại học Thủ Dầu Một"
  };
  maxDistance?: number; // km, default: 5
  preferredLocations?: string[]; // ✅ NEW: e.g., ['Hồ Chí Minh', 'Bình Dương', 'Đồng Nai']
  
  // Salary preferences
  desiredSalary?: {
    hourly?: number;      // VNĐ/giờ, e.g., 25000
    daily?: number;       // VNĐ/ngày
    monthly?: number;     // VNĐ/tháng
  };
  
  // Skills & Experience
  skills?: string[]; // e.g., ['Microsoft Office', 'Tiếng Anh', 'Sales']
  hasExperience?: boolean;
  experienceMonths?: number;
  
  // Job preferences
  preferredJobTypes?: string[]; // e.g., ['Part-time', 'Freelance']
  preferredCategories?: string[]; // e.g., ['F&B', 'Retail']
  
  // Metadata
  updatedAt?: string;
  completionRate?: number; // 0-100, để track profile hoàn chỉnh đến đâu
}

export interface Message {
  $id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  jobId: string;
}

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
  requirements?: string | string[]; // ✅ Can be string or array (viecoi jobs use array)
  benefits?: string | string[]; // ✅ Can be string or array (viecoi jobs use array)
  status?: 'active' | 'closed' | 'draft' | 'inactive';
  companyId?: string;   // ✅ Company ID reference (employer-created jobs)
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
  company_name?: string; // Viecoi jobs use this field for company name
  company_logo?: string; // Viecoi jobs use this field for company logo URL
  salary_text?: string; // Viecoi jobs use this field for salary display
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
  
  // ✅ NEW: Job direction & poster identification
  jobType?: 'employer_seeking' | 'candidate_seeking'; // employer_seeking: employer tìm candidate, candidate_seeking: candidate tìm employer
  posterId?: string; // UID của người đăng (employer hoặc candidate)
  
  // ✅ NEW: Candidate seeking specific fields
  cvUrl?: string; // Link CV của candidate (Google Drive, Dropbox, etc.)
  expectedSalary?: string; // Mức lương mong muốn (text format)
  availableSchedule?: string[]; // Thời gian có thể làm việc (multiple select)

  // ✅ NEW: Employer Job Fields (Added for Edit Job)
  category?: string;
  experience?: string;
  deadline?: string;
  image?: string;
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