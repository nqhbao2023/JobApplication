/**
 * Hook for managing student advanced filters
 * 
 * NEW: Auto-apply filters from studentProfile when toggle is ON
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentFilterState } from '@/components/candidate/StudentAdvancedFilters';
import { Job, StudentProfile } from '@/types';
import { rankJobsByMatch, JobWithScore } from '@/services/jobMatching.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILTERS_STORAGE_KEY = '@student_filters';
const PROFILE_FILTER_ACTIVE_KEY = '@profile_filter_active';

const DEFAULT_FILTERS: StudentFilterState = {
  availableDays: [],
  timeSlots: {
    morning: false,
    afternoon: false,
    evening: false,
    weekend: false,
  },
  maxDistance: 50,
  preferredLocations: [], // ✅ NEW
  minHourlyRate: 0,
  isActive: false,
};

export const useStudentFilters = (jobs: Job[], studentProfile?: StudentProfile) => {
  const [filters, setFilters] = useState<StudentFilterState>(DEFAULT_FILTERS);
  const [profileFilterActive, setProfileFilterActive] = useState(false);
  const [filteredJobs, setFilteredJobs] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved state from AsyncStorage
  useEffect(() => {
    loadSavedState();
  }, []);

  // Auto-apply profile data when profileFilterActive changes or profile updates
  useEffect(() => {
    if (profileFilterActive && studentProfile) {
      applyProfileToFilters();
    } else if (!profileFilterActive) {
      // Reset to default when turned off
      setFilters(prev => ({ ...prev, isActive: false }));
    }
  }, [profileFilterActive, studentProfile]);

  // Apply filters when jobs or filters change
  useEffect(() => {
    applyFilters();
  }, [jobs, filters, studentProfile]);

  const loadSavedState = async () => {
    try {
      const [savedFilters, savedActive] = await Promise.all([
        AsyncStorage.getItem(FILTERS_STORAGE_KEY),
        AsyncStorage.getItem(PROFILE_FILTER_ACTIVE_KEY),
      ]);
      
      if (savedFilters) {
        setFilters(JSON.parse(savedFilters));
      }
      if (savedActive) {
        setProfileFilterActive(JSON.parse(savedActive));
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

  const saveProfileFilterActive = async (active: boolean) => {
    try {
      await AsyncStorage.setItem(PROFILE_FILTER_ACTIVE_KEY, JSON.stringify(active));
    } catch (error) {
      console.error('Error saving profile filter state:', error);
    }
  };

  // Apply studentProfile data to filters
  const applyProfileToFilters = useCallback(() => {
    if (!studentProfile) return;

    const newFilters: StudentFilterState = {
      availableDays: studentProfile.availableDays || [],
      timeSlots: {
        morning: studentProfile.availableTimeSlots?.morning || false,
        afternoon: studentProfile.availableTimeSlots?.afternoon || false,
        evening: studentProfile.availableTimeSlots?.evening || false,
        weekend: studentProfile.availableTimeSlots?.weekend || false,
      },
      maxDistance: studentProfile.maxDistance || 50,
      preferredLocations: studentProfile.preferredLocations || [], // ✅ NEW
      minHourlyRate: studentProfile.desiredSalary?.hourly || 0,
      isActive: true,
    };

    setFilters(newFilters);
    saveFilters(newFilters);
  }, [studentProfile]);

  const handleFiltersChange = useCallback((newFilters: StudentFilterState) => {
    setFilters(newFilters);
    saveFilters(newFilters);
  }, []);

  // Toggle profile-based filtering
  const handleProfileFilterToggle = useCallback((active: boolean) => {
    setProfileFilterActive(active);
    saveProfileFilterActive(active);
    
    if (active && studentProfile) {
      applyProfileToFilters();
    } else {
      setFilters(prev => ({ ...prev, isActive: false }));
    }
  }, [studentProfile, applyProfileToFilters]);

  const applyFilters = useCallback(() => {
    if (!filters.isActive) {
      // No filters active, return all jobs with default sorting
      setFilteredJobs(jobs.map(job => ({ ...job })));
      return;
    }

    // ========== IMPROVED: Stricter scoring-based filtering ==========
    // Jobs are RANKED by match, with penalty for clear mismatches
    // Filter out jobs with score below threshold
    
    const MIN_SCORE_THRESHOLD = 0.3; // ✅ Increased from 0.1 to be more selective
    
    // Check if user has any filter preferences
    const hasSchedulePrefs = filters.availableDays.length > 0;
    const hasTimeSlotPrefs = Object.values(filters.timeSlots).some(v => v);
    const hasSalaryPrefs = filters.minHourlyRate > 0;
    const hasLocationPrefs = (filters.preferredLocations?.length || 0) > 0; // ✅ NEW
    
    // If no preferences set, return all jobs
    if (!hasSchedulePrefs && !hasTimeSlotPrefs && !hasSalaryPrefs && !hasLocationPrefs) {
      console.log('[Filter] No preferences set, returning all jobs');
      setFilteredJobs(jobs.map(job => ({ ...job })));
      return;
    }

    // Score and rank all jobs
    const scoredJobs = jobs.map(job => {
      let score = 0;
      let maxScore = 0;
      const matchDetails: string[] = [];

      // ========== 1. SCHEDULE MATCH (weight: 40%) ==========
      if (hasSchedulePrefs) {
        maxScore += 40;
        const scheduleScore = calculateScheduleScore(job, filters.availableDays);
        score += scheduleScore * 40;
        if (scheduleScore > 0) {
          matchDetails.push(`schedule:${Math.round(scheduleScore * 100)}%`);
        }
      }

      // ========== 2. TIME SLOT MATCH (weight: 30%) ==========
      if (hasTimeSlotPrefs) {
        maxScore += 30;
        const timeSlotScore = calculateTimeSlotScore(job, filters.timeSlots);
        score += timeSlotScore * 30;
        if (timeSlotScore > 0) {
          matchDetails.push(`timeSlot:${Math.round(timeSlotScore * 100)}%`);
        }
      }

      // ========== 3. SALARY MATCH (weight: 20%) ==========
      if (hasSalaryPrefs) {
        maxScore += 20;
        const salaryScore = calculateSalaryMatchScore(job, filters.minHourlyRate);
        score += salaryScore * 20;
        if (salaryScore > 0) {
          matchDetails.push(`salary:${Math.round(salaryScore * 100)}%`);
        }
      }

      // ========== 4. LOCATION MATCH (weight: 20%) ========== ✅ NEW
      if (hasLocationPrefs) {
        maxScore += 20;
        const locationScore = calculateLocationScore(job, filters.preferredLocations || []);
        score += locationScore * 20;
        if (locationScore > 0) {
          matchDetails.push(`location:${Math.round(locationScore * 100)}%`);
        }
      }

      // Normalize score to 0-1
      const normalizedScore = maxScore > 0 ? score / maxScore : 0;

      if (__DEV__ && normalizedScore > 0) {
        console.log(`[Filter] ${job.title}: score=${normalizedScore.toFixed(2)} (${matchDetails.join(', ')})`);
      }

      return {
        ...job,
        matchScore: {
          totalScore: normalizedScore,
          scheduleScore: hasSchedulePrefs ? calculateScheduleScore(job, filters.availableDays) : 0,
          distanceScore: hasLocationPrefs ? calculateLocationScore(job, filters.preferredLocations || []) : 0.5,
          salaryScore: hasSalaryPrefs ? calculateSalaryMatchScore(job, filters.minHourlyRate) : 0,
          skillScore: 0,
          breakdown: {
            scheduleMatch: [],
            matchedSkills: [],
          },
        },
        isHighMatch: normalizedScore >= 0.6,
      } as JobWithScore;
    });

    // Sort by score descending
    const sortedJobs = scoredJobs.sort((a, b) => {
      const scoreA = a.matchScore?.totalScore || 0;
      const scoreB = b.matchScore?.totalScore || 0;
      return scoreB - scoreA;
    });

    // Include all jobs with score > threshold (to show partial matches)
    const result = sortedJobs.filter(job => 
      (job.matchScore?.totalScore || 0) >= MIN_SCORE_THRESHOLD
    );

    // If no jobs match at all, return top 10 by score anyway (as suggestions)
    if (result.length === 0) {
      console.log('[Filter] No jobs above threshold, returning top suggestions');
      setFilteredJobs(sortedJobs.slice(0, 10));
    } else {
      console.log(`[Filter] Found ${result.length} matching jobs`);
      setFilteredJobs(result);
    }
  }, [jobs, filters, studentProfile]);

  // Count for UI display
  const matchedJobsCount = filteredJobs.length;
  const totalJobsCount = jobs.length;

  return {
    filters,
    filteredJobs,
    loading,
    handleFiltersChange,
    // NEW: Profile filter toggle
    profileFilterActive,
    handleProfileFilterToggle,
    matchedJobsCount,
    totalJobsCount,
  };
};

// Helper functions

/**
 * Calculate schedule match score (0-1) - how well job schedule matches user's available days
 * ✅ IMPROVED: Lower neutral score for jobs without schedule info
 */
const calculateScheduleScore = (job: Job, availableDays: string[]): number => {
  if (!availableDays.length) return 0;
  
  const schedule = (job.workSchedule || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  // Handle requirements/benefits that can be string OR array
  const requirements = Array.isArray(job.requirements) 
    ? job.requirements.join(' ').toLowerCase() 
    : (typeof job.requirements === 'string' ? job.requirements.toLowerCase() : '');
  const benefits = Array.isArray(job.benefits) 
    ? job.benefits.join(' ').toLowerCase() 
    : (typeof job.benefits === 'string' ? job.benefits.toLowerCase() : '');
  
  // Combine all text fields for better matching (especially for viecoi jobs)
  const combined = `${schedule} ${description} ${title} ${requirements} ${benefits}`;
  
  // If job mentions "linh hoạt" or "flexible", it's a good match for any schedule
  if (combined.includes('linh hoạt') || combined.includes('flexible') || combined.includes('tự chọn') || 
      combined.includes('sắp xếp') || combined.includes('thoải mái')) {
    return 0.9;
  }
  
  // Count matching days
  let matchCount = 0;
  availableDays.forEach(day => {
    const patterns = getDayPatterns(day);
    if (patterns.some(pattern => combined.includes(pattern))) {
      matchCount++;
    }
  });
  
  // Also check for "cuối tuần" if user selected sat/sun
  const wantsWeekend = availableDays.includes('saturday') || availableDays.includes('sunday');
  if (wantsWeekend && (combined.includes('cuối tuần') || combined.includes('weekend'))) {
    matchCount += 0.5;
  }
  
  // Check for "full week" patterns - these match any day selection
  if (combined.includes('cả tuần') || combined.includes('toàn thời gian') || combined.includes('full-time')) {
    matchCount = availableDays.length * 0.7; // Good but not perfect match
  }
  
  // ✅ IMPROVED: Lower neutral score for jobs without schedule info
  // This encourages jobs WITH matching schedule info to rank higher
  const hasScheduleKeywords = combined.match(/thứ|t[2-7]|cn|monday|tuesday|ca\s|giờ\s|buổi|sáng|chiều|tối/i);
  if (!schedule && !hasScheduleKeywords) {
    return 0.3; // ✅ Lower than before (was 0.5) - unclear match
  }
  
  return Math.min(matchCount / availableDays.length, 1);
};

/**
 * Calculate time slot match score (0-1)
 * ✅ IMPROVED: Penalize clear mismatches, not just neutral for unknown
 */
const calculateTimeSlotScore = (job: Job, timeSlots: StudentFilterState['timeSlots']): number => {
  const description = (job.description || '').toLowerCase();
  const schedule = (job.workSchedule || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  // Handle requirements/benefits that can be string OR array
  const requirements = Array.isArray(job.requirements) 
    ? job.requirements.join(' ').toLowerCase() 
    : (typeof job.requirements === 'string' ? job.requirements.toLowerCase() : '');
  const benefits = Array.isArray(job.benefits) 
    ? job.benefits.join(' ').toLowerCase() 
    : (typeof job.benefits === 'string' ? job.benefits.toLowerCase() : '');
  
  // Combine all text for better matching (especially viecoi jobs)
  const combined = `${description} ${schedule} ${title} ${requirements} ${benefits}`;
  
  // If job mentions "linh hoạt", it matches all time slots
  if (combined.includes('linh hoạt') || combined.includes('flexible') || combined.includes('tự chọn')) {
    return 0.9;
  }
  
  const activeSlots = Object.entries(timeSlots).filter(([_, v]) => v).map(([k]) => k);
  if (!activeSlots.length) return 0;
  
  // ✅ IMPROVED: Detect what time slots the job explicitly mentions
  const jobHasMorning = combined.includes('sáng') || /\b[6-9]h|10h|11h/.test(combined) || combined.includes('ca 1');
  const jobHasAfternoon = combined.includes('chiều') || /\b1[2-7]h/.test(combined) || combined.includes('ca 2');
  const jobHasEvening = combined.includes('tối') || /\b1[8-9]h|20h|21h|22h/.test(combined) || combined.includes('ca 3');
  const jobHasWeekend = combined.includes('cuối tuần') || combined.includes('t7') || combined.includes('cn') || combined.includes('chủ nhật');
  
  const jobHasAnyTimeInfo = jobHasMorning || jobHasAfternoon || jobHasEvening || jobHasWeekend;
  
  let matchCount = 0;
  let mismatchCount = 0;
  
  activeSlots.forEach(slot => {
    switch (slot) {
      case 'morning':
        if (jobHasMorning) matchCount++;
        else if (jobHasAnyTimeInfo && (jobHasAfternoon || jobHasEvening)) mismatchCount++; // Job only has other shifts
        break;
      case 'afternoon':
        if (jobHasAfternoon) matchCount++;
        else if (jobHasAnyTimeInfo && (jobHasMorning || jobHasEvening)) mismatchCount++;
        break;
      case 'evening':
        if (jobHasEvening) matchCount++;
        else if (jobHasAnyTimeInfo && (jobHasMorning || jobHasAfternoon)) mismatchCount++;
        break;
      case 'weekend':
        if (jobHasWeekend) matchCount++;
        // Don't penalize weekend mismatch as much - many jobs don't specify
        break;
    }
  });
  
  // ✅ NEW: If job has no time info at all, give LOW neutral score (not 0.5)
  // This encourages jobs WITH matching info to rank higher
  if (!jobHasAnyTimeInfo) {
    return 0.3; // Lower than before (was 0.5)
  }
  
  // ✅ NEW: Penalize clear mismatches
  if (mismatchCount > 0 && matchCount === 0) {
    return 0.1; // Job clearly doesn't match user's time preference
  }
  
  return matchCount / activeSlots.length;
};

/**
 * Calculate salary match score (0-1)
 */
const calculateSalaryMatchScore = (job: Job, minHourlyRate: number): number => {
  if (!minHourlyRate) return 0;
  
  // Check hourlyRate field first
  if (job.hourlyRate) {
    const ratio = job.hourlyRate / minHourlyRate;
    if (ratio >= 1) return Math.min(ratio, 1.5) / 1.5;
    return ratio * 0.5; // Partial score if below desired
  }
  
  // Try to parse from salary text
  const salaryText = getSalaryText(job);
  if (!salaryText) return 0.5; // Neutral if no salary info
  
  // Try to extract hourly rate
  const hourlyRate = extractHourlyRate(salaryText);
  if (hourlyRate) {
    const ratio = hourlyRate / minHourlyRate;
    if (ratio >= 1) return Math.min(ratio, 1.5) / 1.5;
    return ratio * 0.5;
  }
  
  // Try to estimate from monthly salary
  const monthlyMatch = salaryText.match(/(\d+)\s*(triệu|tr)/i);
  if (monthlyMatch) {
    const monthly = parseInt(monthlyMatch[1]) * 1_000_000;
    // Estimate hourly: monthly / 26 days / 8 hours
    const estimatedHourly = monthly / 26 / 8;
    const ratio = estimatedHourly / minHourlyRate;
    if (ratio >= 1) return Math.min(ratio, 1.5) / 1.5;
    return ratio * 0.5;
  }
  
  // If "thỏa thuận" or negotiable, give neutral score
  if (salaryText.includes('thỏa thuận') || salaryText.includes('thương lượng')) {
    return 0.5;
  }
  
  return 0.3; // Low score if salary info unclear
};

const getDayPatterns = (day: string): string[] => {
  const patterns: Record<string, string[]> = {
    monday: ['thứ 2', 'thứ hai', 't2', 'monday'],
    tuesday: ['thứ 3', 'thứ ba', 't3', 'tuesday'],
    wednesday: ['thứ 4', 'thứ tư', 't4', 'wednesday'],
    thursday: ['thứ 5', 'thứ năm', 't5', 'thursday'],
    friday: ['thứ 6', 'thứ sáu', 't6', 'friday'],
    saturday: ['thứ 7', 'thứ bảy', 't7', 'saturday'],
    sunday: ['chủ nhật', 'cn', 'sunday'],
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

/**
 * ✅ NEW: Calculate location match score (0-1)
 * Matches job location against user's preferred locations
 */
const calculateLocationScore = (job: Job, preferredLocations: string[]): number => {
  if (!preferredLocations.length) return 0;
  
  const jobLocation = (job.location || '').toLowerCase();
  
  // If no location info, return low score
  if (!jobLocation) return 0.2;
  
  // Check if job location matches any preferred location
  for (const location of preferredLocations) {
    const locationLower = location.toLowerCase();
    
    // Direct match or contains
    if (jobLocation.includes(locationLower)) {
      return 1.0; // Perfect match
    }
    
    // Check for common abbreviations and aliases
    const aliases: Record<string, string[]> = {
      'hồ chí minh': ['hcm', 'tp hcm', 'sài gòn', 'saigon', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'quận'],
      'hà nội': ['hn', 'hanoi', 'ha noi'],
      'bình dương': ['bd', 'binh duong', 'thủ dầu một', 'dĩ an', 'thuận an', 'tdm'],
      'đồng nai': ['dn', 'dong nai', 'biên hòa'],
      'đà nẵng': ['dn', 'da nang', 'đà nẵng'],
      'cần thơ': ['ct', 'can tho'],
      'hải phòng': ['hp', 'hai phong'],
      'thủ dầu một': ['tdm', 'thủ dầu một', 'thu dau mot'],
    };
    
    const locationAliases = aliases[locationLower] || [];
    if (locationAliases.some(alias => jobLocation.includes(alias))) {
      return 0.9; // Good match via alias
    }
  }
  
  return 0.1; // No match
};
