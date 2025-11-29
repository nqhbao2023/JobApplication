/**
 * Job Matching Service
 * 
 * Smart algorithm để match jobs với student profile
 * Score formula: scheduleMatch*0.4 + distanceScore*0.3 + salaryScore*0.2 + skillMatch*0.1
 */

import { Job, StudentProfile } from '@/types';

export interface JobMatchScore {
  totalScore: number;
  scheduleScore: number;
  distanceScore: number;
  salaryScore: number;
  skillScore: number;
  breakdown: {
    scheduleMatch: string[];
    distanceKm?: number;
    salaryMatch?: boolean;
    matchedSkills: string[];
  };
}

export interface JobWithScore extends Job {
  matchScore?: JobMatchScore;
  isHighMatch?: boolean; // score > 0.7
}

/**
 * Calculate job matching score for a student
 */
export const calculateJobMatchScore = (
  job: Job,
  studentProfile: StudentProfile,
  currentLocation?: { latitude: number; longitude: number }
): JobMatchScore => {
  let scheduleScore = 0;
  let distanceScore = 0;
  let salaryScore = 0;
  let skillScore = 0;

  const breakdown = {
    scheduleMatch: [] as string[],
    distanceKm: undefined as number | undefined,
    salaryMatch: false,
    matchedSkills: [] as string[],
  };

  // ========== 1. SCHEDULE MATCH (40%) ==========
  scheduleScore = calculateScheduleMatch(job, studentProfile, breakdown);

  // ========== 2. DISTANCE SCORE (30%) ==========
  distanceScore = calculateDistanceScore(job, studentProfile, currentLocation, breakdown);

  // ========== 3. SALARY SCORE (20%) ==========
  salaryScore = calculateSalaryScore(job, studentProfile, breakdown);

  // ========== 4. SKILL MATCH (10%) ==========
  skillScore = calculateSkillMatch(job, studentProfile, breakdown);

  // ========== TOTAL SCORE ==========
  const totalScore =
    scheduleScore * 0.4 +
    distanceScore * 0.3 +
    salaryScore * 0.2 +
    skillScore * 0.1;

  return {
    totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimals
    scheduleScore,
    distanceScore,
    salaryScore,
    skillScore,
    breakdown,
  };
};

/**
 * Schedule matching logic
 */
const calculateScheduleMatch = (
  job: Job,
  profile: StudentProfile,
  breakdown: JobMatchScore['breakdown']
): number => {
  if (!profile.availableDays || profile.availableDays.length === 0) {
    return 0.5; // Default neutral score if no preference
  }

  let matches = 0;
  const total = 5; // Max possible matches

  // Check workSchedule field (e.g., "Thứ 2, 4, 6")
  const workSchedule = job.workSchedule?.toLowerCase() || '';
  const availableDays = profile.availableDays.map(d => d.toLowerCase());

  // Day mapping
  const dayMap: Record<string, string[]> = {
    monday: ['thứ 2', 'thứ hai', 'monday', 't2'],
    tuesday: ['thứ 3', 'thứ ba', 'tuesday', 't3'],
    wednesday: ['thứ 4', 'thứ tư', 'wednesday', 't4'],
    thursday: ['thứ 5', 'thứ năm', 'thursday', 't5'],
    friday: ['thứ 6', 'thứ sáu', 'friday', 't6'],
    saturday: ['thứ 7', 'thứ bảy', 'saturday', 't7'],
    sunday: ['chủ nhật', 'sunday', 'cn'],
  };

  // Check each available day
  availableDays.forEach(day => {
    const patterns = dayMap[day] || [];
    if (patterns.some(pattern => workSchedule.includes(pattern))) {
      matches++;
      breakdown.scheduleMatch.push(day);
    }
  });

  // Check time slots
  if (profile.availableTimeSlots) {
    const description = (job.description || '').toLowerCase();
    const { evening, weekend, lateNight } = profile.availableTimeSlots;

    if (evening && (description.includes('tối') || description.includes('18h') || description.includes('19h'))) {
      matches += 0.5;
      breakdown.scheduleMatch.push('evening');
    }

    if (weekend && (workSchedule.includes('cuối tuần') || workSchedule.includes('thứ 7') || workSchedule.includes('chủ nhật'))) {
      matches += 0.5;
      breakdown.scheduleMatch.push('weekend');
    }

    if (lateNight && description.includes('khuya')) {
      matches += 0.5;
      breakdown.scheduleMatch.push('lateNight');
    }
  }

  return Math.min(matches / total, 1); // Cap at 1.0
};

/**
 * Distance-based scoring using Haversine formula
 */
const calculateDistanceScore = (
  job: Job,
  profile: StudentProfile,
  currentLocation?: { latitude: number; longitude: number },
  breakdown?: JobMatchScore['breakdown']
): number => {
  // Use schoolLocation or currentLocation
  const userLocation = currentLocation || profile.schoolLocation;
  if (!userLocation) return 0.5; // Neutral if no location data

  // Extract coordinates from job location (if available)
  // For now, we'll use a simple city/district match
  // TODO: Implement geocoding or store lat/lng in job data
  const jobLocation = job.location?.toLowerCase() || '';
  const maxDistance = profile.maxDistance || 5; // Default 5km

  // Simple keyword matching for now (Bình Dương, Thủ Dầu Một, etc.)
  const nearbyKeywords = ['thủ dầu một', 'tdmu', 'bình dương', 'dĩ an', 'thuận an'];
  const isNearby = nearbyKeywords.some(keyword => jobLocation.includes(keyword));

  if (isNearby) {
    if (breakdown) breakdown.distanceKm = 3; // Assumed close distance
    return 1.0;
  }

  // TODO: Implement actual Haversine distance calculation when job has coordinates
  return 0.5; // Neutral score for unknown distance
};

/**
 * Haversine distance formula (km)
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Salary matching logic
 */
const calculateSalaryScore = (
  job: Job,
  profile: StudentProfile,
  breakdown: JobMatchScore['breakdown']
): number => {
  if (!profile.desiredSalary) return 0.5; // Neutral if no preference

  const { hourly, daily, monthly } = profile.desiredSalary;

  // Check hourly rate
  if (hourly && job.hourlyRate) {
    const ratio = job.hourlyRate / hourly;
    breakdown.salaryMatch = ratio >= 1;
    return Math.min(ratio, 1.5) / 1.5; // Max score if 1.5x desired
  }

  // Parse salary from salary field
  const salaryText = getSalaryText(job);
  if (!salaryText) return 0.5;

  const salaryNum = extractSalaryNumber(salaryText);
  if (!salaryNum) return 0.5;

  // Check against monthly salary
  if (monthly && salaryNum >= monthly) {
    breakdown.salaryMatch = true;
    return Math.min(salaryNum / monthly, 1.5) / 1.5;
  }

  // Check against daily salary (assuming 26 work days)
  if (daily) {
    const estimatedMonthly = salaryNum;
    const desiredMonthly = daily * 26;
    if (estimatedMonthly >= desiredMonthly) {
      breakdown.salaryMatch = true;
      return Math.min(estimatedMonthly / desiredMonthly, 1.5) / 1.5;
    }
  }

  return 0.5; // Neutral if can't determine
};

/**
 * Get salary text from various fields
 */
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

/**
 * Extract numeric salary from text (in VNĐ)
 */
const extractSalaryNumber = (text: string): number | null => {
  const cleaned = text.toLowerCase().replace(/[.,]/g, '');
  
  // Try to extract number with unit (triệu, tr, k, nghìn)
  const millions = cleaned.match(/(\d+)\s*(triệu|tr)/);
  if (millions) {
    return parseInt(millions[1]) * 1_000_000;
  }

  const thousands = cleaned.match(/(\d+)\s*(k|nghìn)/);
  if (thousands) {
    return parseInt(thousands[1]) * 1_000;
  }

  // Try to extract plain number
  const plain = cleaned.match(/(\d+)/);
  if (plain) {
    const num = parseInt(plain[1]);
    // Assume if < 1000, it's in millions
    if (num < 1000) return num * 1_000_000;
    return num;
  }

  return null;
};

/**
 * Skill matching logic
 */
const calculateSkillMatch = (
  job: Job,
  profile: StudentProfile,
  breakdown: JobMatchScore['breakdown']
): number => {
  if (!profile.skills || profile.skills.length === 0) {
    return 0.5; // Neutral if no skills listed
  }

  // Handle requirements as array or string (viecoi jobs have array)
  const requirementsText = Array.isArray(job.requirements) 
    ? job.requirements.join(' ') 
    : (job.requirements || '');

  const jobText = (
    (job.description || '') +
    ' ' +
    requirementsText +
    ' ' +
    (job.skills_required || '')
  ).toLowerCase();

  const userSkills = profile.skills.map(s => s.toLowerCase());
  let matchCount = 0;

  userSkills.forEach(skill => {
    if (jobText.includes(skill)) {
      matchCount++;
      breakdown.matchedSkills.push(skill);
    }
  });

  return Math.min(matchCount / Math.max(userSkills.length, 3), 1);
};

/**
 * Rank jobs by match score
 */
export const rankJobsByMatch = (
  jobs: Job[],
  studentProfile: StudentProfile,
  currentLocation?: { latitude: number; longitude: number }
): JobWithScore[] => {
  const jobsWithScores: JobWithScore[] = jobs.map(job => {
    const matchScore = calculateJobMatchScore(job, studentProfile, currentLocation);
    return {
      ...job,
      matchScore,
      isHighMatch: matchScore.totalScore >= 0.7,
    };
  });

  // Sort by total score descending
  return jobsWithScores.sort((a, b) => {
    const scoreA = a.matchScore?.totalScore || 0;
    const scoreB = b.matchScore?.totalScore || 0;
    return scoreB - scoreA;
  });
};

/**
 * Filter jobs by minimum match score
 */
export const filterJobsByMinScore = (
  jobs: JobWithScore[],
  minScore: number = 0.5
): JobWithScore[] => {
  return jobs.filter(job => (job.matchScore?.totalScore || 0) >= minScore);
};
