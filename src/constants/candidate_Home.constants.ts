export const PLACEHOLDER_JOB_IMG = 'https://via.placeholder.com/80x80.png?text=Job';
export const PLACEHOLDER_COMPANY_IMG = 'https://via.placeholder.com/80x80.png?text=Company';
export const HEADER_MAX_HEIGHT = 160;
export const HEADER_MIN_HEIGHT = 70;
export const SCROLL_THRESHOLD = 80;
export const CARD_GAP = 14;
export const HORIZONTAL_PADDING = 20;

// ✅ Import and re-export Job type from @/types
import type { Job } from '@/types';
export type { Job };

export type Company = {
  $id: string;
  corp_name?: string;
  nation?: string;
  image?: string;
  color?: string;
};

export type Category = {
  $id: string;
  category_name?: string;
  icon_name?: string;
  color?: string;
};

export type QuickFilter = 'all' | 'intern' | 'part-time' | 'remote' | 'nearby';

export type HomeData = {
  jobs: Job[];
  companies: Company[];
  categories: Category[];
  user: any;
  unreadCount: number;
};

export const getContrastColor = (hexColor?: string): string => {
  if (!hexColor || !hexColor.startsWith('#') || hexColor.length < 7) return '#1e293b';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '#1e293b' : '#FFFFFF';
};

export const QUICK_FILTER_CONFIG: Record<QuickFilter, { label: string; icon: string }> = {
  all: { label: 'Tất cả', icon: 'grid-outline' },
  intern: { label: 'Thực tập', icon: 'school-outline' },
  'part-time': { label: 'Bán thời gian', icon: 'time-outline' },
  remote: { label: 'Từ xa', icon: 'home-outline' },
  nearby: { label: 'Gần bạn', icon: 'location-outline' },
};

/**
 * ✅ FIX: Enhanced filter that checks ALL possible job type fields
 * - job.type (direct field)
 * - job.job_type_id (viecoi crawled jobs: 'internship', 'part-time', etc.)
 * - job.jobTypes?.type_name (employer jobs: reference to job_types collection)
 * - job.title & job.description (fallback keyword search)
 */
export const filterJobsByType = (jobs: Job[], filter: QuickFilter): Job[] => {
  if (filter === 'all') return jobs;
  return jobs.filter(job => {
    const type = job.type?.toLowerCase() || '';
    const title = job.title?.toLowerCase() || '';
    const description = job.description?.toLowerCase() || '';
    const location = job.location?.toLowerCase() || '';
    
    // ✅ Get job type from multiple sources
    const jobTypeId = (job as any).job_type_id?.toLowerCase() || '';
    const jobTypeName = (job as any).jobTypes?.type_name?.toLowerCase() || '';
    const jobTypeRef = typeof (job as any).jobTypes === 'string' ? (job as any).jobTypes.toLowerCase() : '';
    
    const allTypeText = `${type} ${jobTypeId} ${jobTypeName} ${jobTypeRef}`;
    
    if (filter === 'intern') {
      return allTypeText.includes('intern') || 
             allTypeText.includes('thực tập') ||
             allTypeText.includes('internship') ||
             title.includes('thực tập') ||
             title.includes('intern');
    }
    if (filter === 'part-time') {
      return allTypeText.includes('part') || 
             allTypeText.includes('bán thời gian') ||
             allTypeText.includes('part-time') ||
             allTypeText.includes('parttime') ||
             title.includes('part-time') ||
             title.includes('bán thời gian');
    }
    if (filter === 'remote') {
      return allTypeText.includes('remote') || 
             allTypeText.includes('từ xa') ||
             location.includes('remote') ||
             location.includes('từ xa') ||
             title.includes('remote') ||
             title.includes('từ xa') ||
             title.includes('tại nhà');
    }
    return true;
  });
};