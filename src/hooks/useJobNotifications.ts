/**
 * Job Notification Trigger
 * 
 * Automatically send notifications when:
 * 1. New job matches student's schedule
 * 2. Job is nearby (<3km)
 * 3. Job has high salary
 */

import { useEffect, useRef } from 'react';
import { Job, StudentProfile } from '@/types';
import { pushNotificationService } from '@/services/pushNotification.service';
import { calculateJobMatchScore } from '@/services/jobMatching.service';
import * as Location from 'expo-location';

interface UseJobNotificationsProps {
  jobs: Job[];
  studentProfile?: StudentProfile;
  enabled?: boolean;
}

export const useJobNotifications = ({ 
  jobs, 
  studentProfile, 
  enabled = true 
}: UseJobNotificationsProps) => {
  const previousJobIds = useRef<Set<string>>(new Set());
  const currentLocation = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!enabled || !studentProfile) return;

    getLocation();
    checkNewJobs();
  }, [jobs, studentProfile, enabled]);

  const getLocation = async () => {
    try {
      // ✅ FIX: Check permission status first to avoid continuous prompts
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      let finalStatus = existingStatus;
      
      // Only request if undetermined
      if (existingStatus === 'undetermined') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      currentLocation.current = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error: any) {
      // Suppress common location errors to avoid log spam
      if (error?.message?.includes('Location is unavailable') || error?.message?.includes('location services are enabled')) {
         // console.log('[Location] Unavailable (skipping)');
      } else {
         console.log('Error getting location:', error);
      }
    }
  };

  const checkNewJobs = () => {
    if (!studentProfile) return;

    const newJobs = jobs.filter(job => !previousJobIds.current.has(job.$id));

    newJobs.forEach(job => {
      try {
        const matchScore = calculateJobMatchScore(
          job,
          studentProfile,
          currentLocation.current || undefined
        );

        // Ensure job.$id exists before sending notifications
        if (!job.$id) return;
        const jobId = job.$id;
        const jobTitle = job.title || 'Công việc mới';
        const companyName = job.company_name || 'Ẩn danh';

        if (matchScore.totalScore > 0.7) {
          pushNotificationService.notifyNewJobMatch(
            jobTitle,
            companyName,
            matchScore.totalScore,
            jobId
          );
        }

        if (matchScore.breakdown.distanceKm && matchScore.breakdown.distanceKm < 3) {
          pushNotificationService.notifyNearbyJob(
            jobTitle,
            companyName,
            matchScore.breakdown.distanceKm,
            jobId
          );
        }

        if (shouldNotifyHighSalary(job, studentProfile)) {
          const salaryText = job.salary_text || formatSalary(job);
          pushNotificationService.notifyHighSalaryJob(
            jobTitle,
            companyName,
            salaryText,
            jobId
          );
        }

        previousJobIds.current.add(job.$id);
      } catch (error) {
        // Silently skip if notification service unavailable (Expo Go)
      }
    });
  };

  const shouldNotifyHighSalary = (job: Job, profile: StudentProfile): boolean => {
    let jobHourlyRate = 0;

    if (job.salary_text) {
      const match = job.salary_text.match(/(\d+)k?[^\d]*giờ/i);
      if (match) {
        jobHourlyRate = parseInt(match[1]) * (job.salary_text.includes('k') ? 1000 : 1);
      }
    } else if (job.hourlyRate) {
      // Use direct hourlyRate field from Job
      jobHourlyRate = job.hourlyRate;
    } else if (job.salary && typeof job.salary === 'object') {
      if (job.salary.min && job.salary.max) {
        const avgMonthly = (job.salary.min + job.salary.max) / 2;
        jobHourlyRate = avgMonthly / (8 * 22);
      }
    }

    // Use desiredSalary.hourly from StudentProfile 
    const expectedRate = profile.desiredSalary?.hourly || 25000;
    const threshold = expectedRate * 1.2;

    return jobHourlyRate > threshold;
  };

  const formatSalary = (job: Job): string => {
    if (job.salary_text) return job.salary_text;
    
    if (job.hourlyRate) {
      return `${job.hourlyRate.toLocaleString()}đ/giờ`;
    }
    
    if (job.salary && typeof job.salary === 'object') {
      if (job.salary.min && job.salary.max) {
        return `${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()} ${job.salary.currency || 'VND'}`;
      }
    }
    
    return 'Thỏa thuận';
  };
};