import { Job } from '@/types';
import { normalizeSalary } from './salary.utils';

export const normalizeJob = (job: any): Job => {
  return {
    ...job,
    $id: job.$id || job.id || '',
    created_at: job.created_at || job.createdAt || new Date().toISOString(),
    salary: normalizeSalary(job.salary),
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

