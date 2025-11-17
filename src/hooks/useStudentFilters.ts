/**
 * Hook for managing student advanced filters
 */

import { useState, useEffect, useCallback } from 'react';
import { StudentFilterState } from '@/components/candidate/StudentAdvancedFilters';
import { Job, StudentProfile } from '@/types';
import { rankJobsByMatch, JobWithScore } from '@/services/jobMatching.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILTERS_STORAGE_KEY = '@student_filters';

const DEFAULT_FILTERS: StudentFilterState = {
  availableDays: [],
  timeSlots: {
    morning: false,
    afternoon: false,
    evening: false,
    weekend: false,
  },
  maxDistance: 50,
  minHourlyRate: 0,
  isActive: false,
};

export const useStudentFilters = (jobs: Job[], studentProfile?: StudentProfile) => {
  const [filters, setFilters] = useState<StudentFilterState>(DEFAULT_FILTERS);
  const [filteredJobs, setFilteredJobs] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved filters from AsyncStorage
  useEffect(() => {
    loadSavedFilters();
  }, []);

  // Apply filters when jobs or filters change
  useEffect(() => {
    applyFilters();
  }, [jobs, filters, studentProfile]);

  const loadSavedFilters = async () => {
    try {
      const saved = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFilters(parsed);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFilters = async (newFilters: StudentFilterState) => {
    try {
      await AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(newFilters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };

  const handleFiltersChange = useCallback((newFilters: StudentFilterState) => {
    setFilters(newFilters);
    saveFilters(newFilters);
  }, []);

  const applyFilters = useCallback(() => {
    if (!filters.isActive) {
      // No filters active, return all jobs
      setFilteredJobs(jobs.map(job => ({ ...job })));
      return;
    }

    let result = [...jobs];

    // Filter by available days
    if (filters.availableDays.length > 0) {
      result = result.filter(job => {
        const schedule = job.workSchedule?.toLowerCase() || '';
        const description = job.description?.toLowerCase() || '';
        const combined = schedule + ' ' + description;

        return filters.availableDays.some(day => {
          const dayPatterns = getDayPatterns(day);
          return dayPatterns.some(pattern => combined.includes(pattern));
        });
      });
    }

    // Filter by time slots
    const activeTimeSlots = Object.entries(filters.timeSlots)
      .filter(([_, value]) => value)
      .map(([key, _]) => key);

    if (activeTimeSlots.length > 0) {
      result = result.filter(job => {
        const description = (job.description || '').toLowerCase();
        const schedule = (job.workSchedule || '').toLowerCase();
        const combined = description + ' ' + schedule;

        return activeTimeSlots.some(slot => {
          switch (slot) {
            case 'morning':
              return combined.includes('sáng') || /\b[6-9]h|10h|11h/.test(combined);
            case 'afternoon':
              return combined.includes('chiều') || /\b1[2-7]h/.test(combined);
            case 'evening':
              return combined.includes('tối') || /\b1[8-9]h|20h|21h|22h/.test(combined);
            case 'weekend':
              return combined.includes('cuối tuần') || combined.includes('thứ 7') || combined.includes('chủ nhật');
            default:
              return false;
          }
        });
      });
    }

    // Filter by distance (simplified - keyword matching)
    if (filters.maxDistance < 50) {
      result = result.filter(job => {
        const location = (job.location || '').toLowerCase();
        // Nearby keywords for Thủ Dầu Một area
        const nearbyKeywords = ['thủ dầu một', 'tdmu', 'bình dương', 'dĩ an', 'thuận an'];
        return nearbyKeywords.some(keyword => location.includes(keyword));
      });
    }

    // Filter by hourly rate
    if (filters.minHourlyRate > 0) {
      result = result.filter(job => {
        if (job.hourlyRate && job.hourlyRate >= filters.minHourlyRate) {
          return true;
        }

        // Try to parse salary
        const salaryText = getSalaryText(job);
        if (!salaryText) return false;

        const hourlyRate = extractHourlyRate(salaryText);
        return hourlyRate && hourlyRate >= filters.minHourlyRate;
      });
    }

    // Rank by matching score if studentProfile is available
    if (studentProfile) {
      const profile: StudentProfile = {
        ...studentProfile,
        availableDays: filters.availableDays,
        availableTimeSlots: filters.timeSlots,
        maxDistance: filters.maxDistance,
        desiredSalary: {
          ...studentProfile.desiredSalary,
          hourly: filters.minHourlyRate || studentProfile.desiredSalary?.hourly,
        },
      };
      
      const ranked = rankJobsByMatch(result, profile);
      setFilteredJobs(ranked);
    } else {
      setFilteredJobs(result.map(job => ({ ...job })));
    }
  }, [jobs, filters, studentProfile]);

  return {
    filters,
    filteredJobs,
    loading,
    handleFiltersChange,
  };
};

// Helper functions
const getDayPatterns = (day: string): string[] => {
  const patterns: Record<string, string[]> = {
    monday: ['thứ 2', 'thứ hai', 't2'],
    tuesday: ['thứ 3', 'thứ ba', 't3'],
    wednesday: ['thứ 4', 'thứ tư', 't4'],
    thursday: ['thứ 5', 'thứ năm', 't5'],
    friday: ['thứ 6', 'thứ sáu', 't6'],
    saturday: ['thứ 7', 'thứ bảy', 't7'],
    sunday: ['chủ nhật', 'cn'],
  };
  return patterns[day] || [];
};

const getSalaryText = (job: Job): string => {
  if (job.salary_text) return job.salary_text;
  if (typeof job.salary === 'string') return job.salary;
  if (typeof job.salary === 'object' && job.salary) {
    const { min, max } = job.salary;
    if (max) return max.toString();
    if (min) return min.toString();
  }
  return '';
};

const extractHourlyRate = (text: string): number | null => {
  const hourlyMatch = text.match(/(\d+)k?[\/\s]*(?:giờ|h)/i);
  if (hourlyMatch) {
    const value = parseInt(hourlyMatch[1]);
    return value < 1000 ? value * 1000 : value; // Convert k to full number
  }
  return null;
};
