import { Job } from '@/types';
import { normalizeSalary } from './salary.utils';

const PLACEHOLDER_JOB_IMG = 'https://via.placeholder.com/400x300.png?text=Job+Image';

/**
 * Validate if a URL is valid
 */
const isValidImageUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string') return false;
  // Check if it's a valid HTTP/HTTPS URL or data URI
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
};

export const normalizeJob = (job: any): Job => {
  // ✅ Ensure $id is always a non-empty string
  const jobId = job.$id || job.id;
  if (!jobId || typeof jobId !== 'string') {
    throw new Error('Job must have a valid id or $id');
  }
  
  // ✅ Normalize image URL
  let imageUrl = job.image || job.img || job.imageUrl;
  if (!isValidImageUrl(imageUrl)) {
    imageUrl = PLACEHOLDER_JOB_IMG;
  }
  
  // ✅ Ensure employerId exists (required for New Plan)
  const employerId = job.employerId || job.ownerId || job.users?.id || job.users?.$id || 'unknown-employer';
  
  return {
    ...job,
    $id: jobId,
    image: imageUrl,
    created_at: job.created_at || job.createdAt || new Date().toISOString(),
    salary: normalizeSalary(job.salary),
    employerId, // ✅ Always provide employerId
    // ✅ NEW PLAN fields (preserve if exist)
    jobSource: job.jobSource || 'featured', // Default to featured for legacy jobs
    sourceUrl: job.sourceUrl,
    contactInfo: job.contactInfo,
    isVerified: job.isVerified,
    isFeatured: job.isFeatured,
    workSchedule: job.workSchedule,
    hourlyRate: job.hourlyRate,
    // ✅ Viecoi aggregator fields
    source: job.source,
    external_url: job.external_url,
    company_name: job.company_name,
    company_logo: job.company_logo, // Preserve company logo from viecoi jobs
    salary_text: job.salary_text,
  };
};

export const sortJobsByDate = (jobs: Job[]): Job[] => {
  return [...jobs].sort((a, b) => {
    const dateA = Date.parse(a.created_at || '0') || 0;
    const dateB = Date.parse(b.created_at || '0') || 0;
    return dateB - dateA;
  });
};

export const filterJobsByType = (jobs: Job[], type: string): Job[] => {
  const typeLower = type.toLowerCase();
  return jobs.filter(job => {
    const jobType = job.type?.toLowerCase() || '';
    return jobType.includes(typeLower);
  });
};

