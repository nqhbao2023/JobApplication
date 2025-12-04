import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

import * as Haptics from 'expo-haptics';
import { auth } from '@/config/firebase';
import { jobApiService } from '@/services/jobApi.service';
import { companyApiService } from '@/services/companyApi.service';
import { categoryApiService } from '@/services/categoryApi.service';
import { notificationApiService } from '@/services/notificationApi.service';
import { authApiService } from '@/services/authApi.service';

import type { Job, Company, Category } from '@/types';
import { normalizeJob, sortJobsByDate } from '@/utils/job.utils';
import { handleApiError } from '@/utils/errorHandler';
import { calculateJobMatchScore, JobWithScore } from '@/services/jobMatching.service';
import * as Location from 'expo-location';
import { useCandidateHomeStore, CANDIDATE_HOME_CACHE_TTL } from '@/stores/candidateHomeStore';

export type QuickFilter = 'all' | 'intern' | 'part-time' | 'remote' | 'nearby';

export type CategoryWithCount = Category & { jobCount: number };

export const useCandidateHome = () => {
  const [userId, setUserId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>('all');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | undefined>();

  const scrollY = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);
  
  const isLoadingRef = useRef(false);
  const {
    user: dataUser,
    jobs: dataJob,
    companies: dataCompany,
    categories: dataCategories,
    unreadCount,
    loading,
    error,
    lastFetchedAt,
    hydrated,
    setStateFromPayload: setStoreState,
    setLoading: setStoreLoading,
    setError: setStoreError,
    setUnreadCount: setStoreUnread,
    setLastFetchedAt,
  } = useCandidateHomeStore();

  // Load current location for distance-based matching (candidate-only)
  useEffect(() => {
    const shouldRequestLocation = !dataUser?.role || dataUser.role === 'candidate';
    if (!shouldRequestLocation) return;

    let cancelled = false;

    (async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled || cancelled) return;

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        const location = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error: any) {
        if (__DEV__) {
          console.info('[Location] Skip location fetch:', error?.message || error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataUser?.role]);

  const load_user_id = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (user) setUserId(user.uid);
    } catch (e) {
      console.error('load_user_id error:', e);
    }
  }, []);

  const load_data_user = useCallback(async () => {
    if (!userId) return undefined;
    try {
      const profile = await authApiService.getProfile();
      const displayName = profile.name || profile.email || '';
      return {
        ...profile,
        $id: profile.uid,
        uid: profile.uid,
        displayName,
        name: profile.name || displayName,
        photoURL: profile.photoURL || auth.currentUser?.photoURL || null,
        role: profile.role || 'candidate',
        skills: profile.skills || [], // ✅ Include skills for AI recommendations
      };
    } catch (e: any) {
      handleApiError(e, 'update_profile', { silent: true });
      const user = auth.currentUser;
      if (user) {
        return {
          $id: user.uid,
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email || '',
          displayName: user.displayName || user.email || '',
          photoURL: user.photoURL,
          role: 'candidate',
          skills: [], // ✅ Empty skills fallback
        };
      }
      return undefined;
    }
  }, [userId]);

  const load_data_job = useCallback(async () => {
    try {
      // ✅ FIX: Tăng limit để load nhiều jobs hơn cho việc filter chính xác
      // Trước đây chỉ load 30 jobs → filter không đủ dữ liệu
      const response = await jobApiService.getAllJobs({ limit: 100 });
      const normalizedJobs = response.jobs.map(normalizeJob);
      const sortedJobs = sortJobsByDate(normalizedJobs);
      if (__DEV__) console.log('[Tải công việc] Đã tải', response.jobs.length, 'công việc');
      return sortedJobs;
    } catch (e: any) {
      console.error('[Lỗi] Không thể tải công việc:', e.message);
      handleApiError(e, 'generic', { silent: true });
      throw e;
    }
  }, []);

  const load_data_company = useCallback(async () => {
    try {
      const companies = await companyApiService.getAllCompanies(12);
      
      // ✅ Normalize company image URLs
      const normalizedCompanies = companies.map(company => {
        let imageUrl = company.image;
        // If image is invalid (like "1" or undefined), use placeholder
        if (!imageUrl || typeof imageUrl !== 'string' || 
            (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
          imageUrl = 'https://via.placeholder.com/400x300.png?text=' + encodeURIComponent(company.corp_name || 'Company');
        }
        return { ...company, image: imageUrl };
      });
      
      if (__DEV__) console.log('[Tải công ty] Đã tải', companies.length, 'công ty');
      return normalizedCompanies;
    } catch (e: any) {
      console.error('[Lỗi] Không thể tải công ty:', e.message);
      handleApiError(e, 'generic', { silent: true });
      throw e;
    }
  }, []);

  const load_data_categories = useCallback(async () => {
    try {
      const categories = await categoryApiService.getAllCategories(12);
      if (__DEV__) console.log('[Tải danh mục] Đã tải', categories.length, 'danh mục');
      return categories;
    } catch (e: any) {
      console.error('[Lỗi] Không thể tải danh mục:', e.message);
      handleApiError(e, 'generic', { silent: true });
      throw e;
    }
  }, []);

  const loadUnreadNotifications = useCallback(async () => {
    const isCandidate = !dataUser?.role || dataUser.role === 'candidate';
    if (!userId || !isCandidate) return 0;
    try {
      const count = await notificationApiService.getUnreadCount();
      return count;
    } catch (e: any) {
      // ✅ Silent fail for notifications - không quan trọng lắm
      // Không show error, không làm gián đoạn UX
      if (__DEV__) console.warn('[Cảnh báo] Không thể tải thông báo');
    }
    return 0;
  }, [userId, dataUser?.role]);

  const loadAllData = useCallback(async (force = false) => {
    if (isLoadingRef.current) return;
    
    // ✅ Check cache - skip nếu data còn fresh
    const lastLoad = lastFetchedAt ?? 0;
    const timeSinceLastLoad = Date.now() - lastLoad;
    const shouldUseCache = hydrated && !force && dataJob.length > 0 && timeSinceLastLoad < CANDIDATE_HOME_CACHE_TTL;
    
    if (shouldUseCache) {
      if (__DEV__) console.log(`[Cache] Dùng dữ liệu đã lưu (${Math.round(timeSinceLastLoad / 1000)}s trước)`);
      setStoreLoading(false);
      return;
    }
    
    isLoadingRef.current = true;
    setStoreLoading(true);
    setStoreError(null);
    
    try {
      // ✅ Load sequentially với delay để tránh rate limit
      const userProfile = await load_data_user();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const jobs = await load_data_job();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const companies = await load_data_company();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const categories = await load_data_categories();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const unread = await loadUnreadNotifications();

      setStoreState({
        user: userProfile ?? dataUser,
        jobs: jobs ?? dataJob,
        companies: companies ?? dataCompany,
        categories: categories ?? dataCategories,
      });
      setStoreUnread(unread);
      const timestamp = Date.now();
      setLastFetchedAt(timestamp);
      if (__DEV__) console.log('[Tải dữ liệu] Hoàn tất');
    } catch (e) {
      console.error('[Lỗi] Không thể tải dữ liệu:', e);
      const errorMessage = (e as any)?.response?.data?.message || (e as any)?.message || 'Không thể tải dữ liệu';
      setStoreError(errorMessage);
    } finally {
      setStoreLoading(false);
      isLoadingRef.current = false;
    }
  }, [hydrated, dataJob, dataCompany, dataCategories, lastFetchedAt, load_data_user, load_data_job, load_data_company, load_data_categories, loadUnreadNotifications, setStoreState, setStoreUnread, setLastFetchedAt, setStoreLoading, setStoreError]);

  useEffect(() => {
    load_user_id();
  }, [load_user_id]);

  useEffect(() => {
    if (!userId || isLoadingRef.current) return;
    loadAllData();
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      // ✅ Không auto-reload khi focus, chỉ load nếu chưa có data
      if (dataJob.length === 0) {
        loadAllData(true); // Force load lần đầu
      }
    }, [userId, dataJob.length])
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadAllData(true); // ✅ Force reload khi pull-to-refresh
    setRefreshing(false);
  }, [loadAllData]);
  const reload = useCallback(() => {
    if (!userId) return;
    loadAllData();
  }, [userId, loadAllData]);

  const handleFilterChange = useCallback((filter: QuickFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFilter(filter);
  }, []);

  const resetUnreadCount = useCallback(() => {
    setStoreUnread(0);
  }, [setStoreUnread]);

  const companyMap = useMemo(() => {
    const m: Record<string, Company> = {};
    for (const c of dataCompany) {
      m[c.$id] = c;
    }
    return m;
  }, [dataCompany]);

  const getJobCompany = useCallback((job: Job): Company | undefined => {
    // Priority 1: Try companyId field (employer-created jobs)
    if (job.companyId) {
      const company = companyMap[job.companyId];
      if (company) return company;
    }
    
    // Priority 2: Try company field (legacy)
    if (!job.company) return undefined;
    if (typeof job.company === 'string') return companyMap[job.company];
    if (typeof job.company === 'object' && job.company.$id) {
      return companyMap[job.company.$id];
    }
    
    return undefined;
  }, [companyMap]);

  const categoryJobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dataCategories.forEach(cat => {
      counts[cat.$id] = dataJob.filter(job => {
        const jc = job.jobCategories;
        if (!jc) return false;
        if (typeof jc === 'string') return jc === cat.$id || jc === cat.category_name;
        if (Array.isArray(jc) && typeof jc[0] === 'string') {
          return (jc as string[]).some(x => x === cat.$id || x === cat.category_name);
        }
        if (Array.isArray(jc)) {
          return jc.some((x: any) => x?.$id === cat.$id);
        }
        if (typeof jc === 'object' && jc.$id) {
          return jc.$id === cat.$id;
        }
        return false;
      }).length;
    });
    return counts;
  }, [dataJob, dataCategories]);

  const filteredJobs = useMemo(() => {
    // ✅ STEP 1: Base filter by jobType - chỉ hiển thị employer_seeking jobs
    // (jobs mà employer đăng để tìm candidate, KHÔNG phải candidate_seeking - candidate tìm việc)
    let baseFiltered = dataJob.filter(job => {
      // ✅ FIX: Skip inactive/pending jobs (chưa được duyệt)
      if (job.status !== 'active') return false;
      
      // Skip candidate_seeking jobs (quick-post từ candidate tìm việc)
      if (job.jobType === 'candidate_seeking') return false;
      
      // Skip quick-post jobs from candidates (backup check)
      if (job.jobSource === 'quick-post' && job.posterId) return false;
      
      // Skip jobs mà chính user đăng (không nên thấy job của mình trong feed)
      if (job.posterId && job.posterId === userId) return false;
      if (job.employerId && job.employerId === userId) return false;
      if (job.ownerId && job.ownerId === userId) return false;
      
      return true;
    });
    
    // ✅ STEP 2: Apply quick filter
    if (selectedFilter === 'all') return baseFiltered;
    return baseFiltered.filter(job => {
      // ✅ FIX: Check ALL possible job type fields for comprehensive filtering
      const type = job.type?.toLowerCase() || '';
      const location = job.location?.toLowerCase() || '';
      const title = job.title?.toLowerCase() || '';
      const description = job.description?.toLowerCase() || '';
      
      // ✅ Get job type from multiple sources (employer jobs vs viecoi crawled jobs)
      const jobTypeId = (job as any).job_type_id?.toLowerCase() || ''; // viecoi format: 'internship', 'part-time'
      const jobTypeName = (job as any).jobTypes?.type_name?.toLowerCase() || ''; // employer format: reference to job_types collection
      const jobTypeRef = typeof (job as any).jobTypes === 'string' ? (job as any).jobTypes.toLowerCase() : '';
      
      // Combine all type-related text for comprehensive search
      const allTypeText = `${type} ${jobTypeId} ${jobTypeName} ${jobTypeRef}`;
      const allSearchText = `${allTypeText} ${title} ${description}`.toLowerCase();
      
      if (selectedFilter === 'intern') {
        // Check type fields + title/description for intern keywords
        return allTypeText.includes('intern') || 
               allTypeText.includes('thực tập') ||
               allTypeText.includes('internship') ||
               title.includes('thực tập') ||
               title.includes('intern');
      }
      if (selectedFilter === 'part-time') {
        // Check type fields + title/description for part-time keywords
        return allTypeText.includes('part') || 
               allTypeText.includes('bán thời gian') ||
               allTypeText.includes('part-time') ||
               allTypeText.includes('parttime') ||
               title.includes('part-time') ||
               title.includes('bán thời gian');
      }
      if (selectedFilter === 'remote') {
        return allTypeText.includes('remote') || 
               allTypeText.includes('từ xa') ||
               location.includes('remote') || 
               location.includes('từ xa') ||
               title.includes('remote') ||
               title.includes('từ xa') ||
               title.includes('tại nhà') ||
               title.includes('work from home') ||
               description.includes('work from home') ||
               description.includes('làm việc từ xa');
      }
      if (selectedFilter === 'nearby') {
        // Nearby keywords for Bình Dương area (TDMU students)
        const nearbyKeywords = [
          'thủ dầu một', 'tdm', 'bình dương', 'dĩ an', 'thuận an',
          'tân uyên', 'bàu bàng', 'bến cát', 'phú giáo', 'dầu tiếng'
        ];
        const locationText = (location + ' ' + title + ' ' + description).toLowerCase();
        return nearbyKeywords.some(keyword => locationText.includes(keyword));
      }
      return true;
    });
  }, [dataJob, selectedFilter, userId]);

  // ✅ Base filtered jobs (before quick filters) for match scoring
  const baseFilteredJobs = useMemo(() => {
    return dataJob.filter(job => {
      // ✅ FIX: Skip inactive/pending jobs (chưa được duyệt)
      if (job.status !== 'active') return false;
      
      // Skip candidate_seeking jobs (quick-post từ candidate tìm việc)
      if (job.jobType === 'candidate_seeking') return false;
      
      // Skip quick-post jobs from candidates (backup check)
      if (job.jobSource === 'quick-post' && job.posterId) return false;
      
      // Skip jobs mà chính user đăng
      if (job.posterId && job.posterId === userId) return false;
      if (job.employerId && job.employerId === userId) return false;
      if (job.ownerId && job.ownerId === userId) return false;
      
      return true;
    });
  }, [dataJob, userId]);

  // ✅ Calculate match scores for jobs using AI matching
  const jobsWithMatchScores = useMemo((): JobWithScore[] => {
    const studentProfile = dataUser?.studentProfile;
    if (!studentProfile) {
      // No profile yet, return jobs without scores
      return baseFilteredJobs.map(job => ({ ...job, matchScore: undefined, isHighMatch: false }));
    }

    return baseFilteredJobs.map(job => {
      const matchScore = calculateJobMatchScore(job, studentProfile, currentLocation);
      const isHighMatch = matchScore.totalScore >= 0.7; // 70% or higher

      return {
        ...job,
        matchScore,
        isHighMatch,
      };
    });
  }, [dataJob, dataUser?.studentProfile, currentLocation]);

  // Sort by match score for "For You" section
  const forYouJobs = useMemo(() => {
    const scored = jobsWithMatchScores
      .filter(job => selectedFilter === 'all' ? true : filteredJobs.some(fj => fj.$id === job.$id))
      .sort((a, b) => (b.matchScore?.totalScore || 0) - (a.matchScore?.totalScore || 0))
      .slice(0, 10); // Top 10 matched jobs
    
    return scored;
  }, [jobsWithMatchScores, selectedFilter, filteredJobs]);

  const latestJobs = useMemo(() => jobsWithMatchScores.slice(0, 6), [jobsWithMatchScores]);

  const trendingCategories = useMemo((): CategoryWithCount[] => {
    return dataCategories
      .map(cat => ({ ...cat, jobCount: categoryJobCounts[cat.$id] || 0 }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 6);
  }, [dataCategories, categoryJobCounts]);

  const data = useMemo(() => ({
    user: dataUser,
    jobs: dataJob,
    companies: dataCompany,
    categories: dataCategories,
    unreadCount,
  }), [dataUser, dataJob, dataCompany, dataCategories, unreadCount]);

  return {
    userId,
    dataJob,
    dataUser,
    dataCategories,
    dataCompany,
    unreadCount,
    refreshing,
    loading,
    error,
    selectedFilter,
    data,
    scrollY,
    hasTriggeredHaptic,
    companyMap,
    categoryJobCounts,
    filteredJobs,
    forYouJobs,
    latestJobs,
    trendingCategories,
    getJobCompany,
    onRefresh,
    reload,
    handleFilterChange,
    resetUnreadCount,
  };
};