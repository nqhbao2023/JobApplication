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

import { Job, Company, Category } from '@/types';
import { normalizeJob, sortJobsByDate } from '@/utils/job.utils';
import { handleApiError } from '@/utils/errorHandler';
import { calculateJobMatchScore, JobWithScore } from '@/services/jobMatching.service';
import * as Location from 'expo-location';

export type QuickFilter = 'all' | 'intern' | 'part-time' | 'remote' | 'nearby';

export type CategoryWithCount = Category & { jobCount: number };

export const useCandidateHome = () => {
  const [userId, setUserId] = useState<string>('');
  const [dataJob, setDataJob] = useState<Job[]>([]);
  const [dataUser, setDataUser] = useState<any>();
  const [dataCategories, setDataCategories] = useState<Category[]>([]);
  const [dataCompany, setDataCompany] = useState<Company[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>('all');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | undefined>();

  const scrollY = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);
  
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Load current location for distance-based matching
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        if (__DEV__) console.warn('[Location] Could not get current location', error);
      }
    })();
  }, []);

  const load_user_id = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (user) setUserId(user.uid);
    } catch (e) {
      console.error('load_user_id error:', e);
    }
  }, []);

  const load_data_user = useCallback(async () => {
    if (!userId) return;
    try {
      const profile = await authApiService.getProfile();
      const displayName = profile.name || profile.email || '';
      setDataUser({
        ...profile,
        $id: profile.uid,
        displayName,
        name: profile.name || displayName,
        photoURL: profile.photoURL || auth.currentUser?.photoURL || null,
      });
    } catch (e: any) {
      handleApiError(e, 'update_profile', { silent: true });
      const user = auth.currentUser;
      if (user) {
        setDataUser({
          $id: user.uid,
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email || '',
          displayName: user.displayName || user.email || '',
          photoURL: user.photoURL,
          role: 'candidate',
        });
      }    }
  }, [userId]);

  const load_data_job = useCallback(async () => {
    try {
      const response = await jobApiService.getAllJobs({ limit: 30 });
      const normalizedJobs = response.jobs.map(normalizeJob);
      const sortedJobs = sortJobsByDate(normalizedJobs);
      setDataJob(sortedJobs);
      if (__DEV__) console.log('[Tải công việc] Đã tải', response.jobs.length, 'công việc');
    } catch (e: any) {
      console.error('[Lỗi] Không thể tải công việc:', e.message);
      const errorMessage = e?.response?.data?.message || e?.message || 'Không thể tải danh sách việc làm';
      setError(errorMessage);
      handleApiError(e, 'generic', { silent: true });
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
      
      setDataCompany(normalizedCompanies);
      if (__DEV__) console.log('[Tải công ty] Đã tải', companies.length, 'công ty');
    } catch (e: any) {
      console.error('[Lỗi] Không thể tải công ty:', e.message);
      const errorMessage = e?.response?.data?.message || e?.message || 'Không thể tải danh sách công ty';
      setError(errorMessage);
      handleApiError(e, 'generic', { silent: true });
    }
  }, []);

  const load_data_categories = useCallback(async () => {
    try {
      const categories = await categoryApiService.getAllCategories(12);
      setDataCategories(categories);
      if (__DEV__) console.log('[Tải danh mục] Đã tải', categories.length, 'danh mục');
    } catch (e: any) {
      console.error('[Lỗi] Không thể tải danh mục:', e.message);
      const errorMessage = e?.response?.data?.message || e?.message || 'Không thể tải danh mục việc làm';
      setError(errorMessage);
      handleApiError(e, 'generic', { silent: true });
    }
  }, []);

  const loadUnreadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const count = await notificationApiService.getUnreadCount();
      setUnreadCount(count);
    } catch (e: any) {
      // ✅ Silent fail for notifications - không quan trọng lắm
      // Không show error, không làm gián đoạn UX
      if (__DEV__) console.warn('[Cảnh báo] Không thể tải thông báo');
    }
  }, [userId]);

  const loadAllData = useCallback(async (force = false) => {
    if (isLoadingRef.current) return;
    
    // ✅ Check cache - skip nếu data còn fresh
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    if (!force && timeSinceLastLoad < CACHE_DURATION && dataJob.length > 0) {
      if (__DEV__) console.log(`[Cache] Dùng dữ liệu đã lưu (${Math.round(timeSinceLastLoad / 1000)}s trước)`);
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // ✅ Load sequentially với delay để tránh rate limit
      await load_data_user();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await load_data_job();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await load_data_company();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await load_data_categories();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await loadUnreadNotifications();
      
      lastLoadTimeRef.current = Date.now(); // ✅ Update cache timestamp
      if (__DEV__) console.log('[Tải dữ liệu] Hoàn tất');
    } catch (e) {
      console.error('[Lỗi] Không thể tải dữ liệu:', e);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [load_data_user, load_data_job, load_data_company, load_data_categories, loadUnreadNotifications, dataJob.length]);

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

  const clearNotifications = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const companyMap = useMemo(() => {
    const m: Record<string, Company> = {};
    for (const c of dataCompany) {
      m[c.$id] = c;
    }
    return m;
  }, [dataCompany]);

  const getJobCompany = useCallback((job: Job): Company | undefined => {
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
    if (selectedFilter === 'all') return dataJob;
    return dataJob.filter(job => {
      const type = job.type?.toLowerCase() || '';
      const location = job.location?.toLowerCase() || '';
      const title = job.title?.toLowerCase() || '';
      const description = job.description?.toLowerCase() || '';
      
      if (selectedFilter === 'intern') {
        return type.includes('intern') || type.includes('thực tập');
      }
      if (selectedFilter === 'part-time') {
        return type.includes('part') || type.includes('bán thời gian');
      }
      if (selectedFilter === 'remote') {
        return type.includes('remote') || type.includes('từ xa') || 
               location.includes('remote') || location.includes('từ xa') ||
               title.includes('tại nhà') || description.includes('work from home');
      }
      if (selectedFilter === 'nearby') {
        // Nearby keywords for Bình Dương area (TDMU students)
        const nearbyKeywords = [
          'thủ dầu một', 'tdm', 'bình dương', 'dĩ an', 'thuận an',
          'tân uyên', 'bàu bàng', 'bến cát', 'phú giáo', 'dầu tiếng'
        ];
        const locationText = location + ' ' + title + ' ' + description;
        return nearbyKeywords.some(keyword => locationText.includes(keyword));
      }
      return true;
    });
  }, [dataJob, selectedFilter]);

  // ✅ Calculate match scores for jobs using AI matching
  const jobsWithMatchScores = useMemo((): JobWithScore[] => {
    if (!dataUser?.studentProfile) {
      // No profile yet, return jobs without scores
      return dataJob.map(job => ({ ...job, matchScore: undefined, isHighMatch: false }));
    }

    return dataJob.map(job => {
      const matchScore = calculateJobMatchScore(job, dataUser.studentProfile, currentLocation);
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
    clearNotifications,
    resetUnreadCount,
  };
};