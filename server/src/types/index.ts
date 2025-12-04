// server/src/types/index.ts (ADD AIRecommendation export)
export interface User {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: 'candidate' | 'employer' | 'admin';
  skills?: string[];
  savedJobIds?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Job {
  id?: string;
  $id?: string;
  title: string;
  company: string;
  companyId: string;
  description: string;
  requirements: string[];
  skills: string[];
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  category: string;
  status: 'active' | 'inactive' | 'closed';
  image?: string;
  employerId: string;
  ownerId?: string;
  applicantCount?: number;
  viewCount?: number;
  created_at?: string;
  updated_at?: string;
  createdAt: any;
  updatedAt: any;
  expiresAt?: any;
  
  // ✅ NEW PLAN: Job Aggregator Fields
  source?: 'viecoi' | 'internal' | 'quick-post'; // Source from crawler (viecoi, internal, quick-post)
  external_url?: string; // External URL from crawler (snake_case to match Firestore)
  is_verified?: boolean; // Verified status from Firestore (snake_case)
  jobSource?: 'crawled' | 'quick-post' | 'featured'; // Legacy: Nguồn job
  sourceUrl?: string; // Legacy: URL gốc nếu crawled
  company_name?: string; // Company name for viecoi jobs (snake_case to match Firestore)
  company_logo?: string; // Company logo URL for viecoi jobs (snake_case to match Firestore)
  salary_text?: string; // Salary display text for viecoi jobs (snake_case to match Firestore)
  contactInfo?: {
    phone?: string;
    zalo?: string;
    facebook?: string;
    email?: string;
  }; // Contact cho quick-post và featured
  isVerified?: boolean; // Camel case version: Admin đã duyệt chưa (cho quick-post)
  isFeatured?: boolean; // Featured job (trả phí)
  workSchedule?: string; // VD: "Thứ 2,4,6 tối", "Cuối tuần"
  hourlyRate?: number; // Lương theo giờ (cho part-time)
  
  // ✅ NEW: Job direction & poster identification
  jobType?: 'employer_seeking' | 'candidate_seeking'; // employer_seeking: employer tìm candidate, candidate_seeking: candidate tìm employer
  posterId?: string; // UID của người đăng (employer hoặc candidate)
}

export interface Application {
  id?: string;
  jobId: string;
  candidateId: string;
  employerId: string;
  status: 'draft' | 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
  cvUrl?: string;
  coverLetter?: string;
  appliedAt: any;
  updatedAt: any;
}

export interface NewsArticle {
  id?: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  category: string;
  publishedAt: any;
  createdAt: any;
}

// ✅ ADD THIS EXPORT
export interface AIRecommendation {
  jobId: string;
  score: number;
  reason: string;
  matchedSkills: string[];
}