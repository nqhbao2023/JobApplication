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

  const scrollY = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);
  
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);
  const CACHE_DURATION = 30000; // 30 seconds cache

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
    console.log('🔵 load_data_job START');
    try {
      const response = await jobApiService.getAllJobs({ limit: 30 });
      console.log('🟢 load_data_job SUCCESS:', response.jobs.length, 'jobs');
      
      const normalizedJobs = response.jobs.map(normalizeJob);
      const sortedJobs = sortJobsByDate(normalizedJobs);
      
      // Debug: Check image URLs
      console.log('🖼️ First job image:', sortedJobs[0]?.image);
      console.log('🖼️ Sample job data:', JSON.stringify(sortedJobs[0], null, 2));
      
      setDataJob(sortedJobs);
    } catch (e: any) {
      console.error('🔴 load_data_job ERROR:', e.message);
      const errorMessage = e?.response?.data?.message || e?.message || 'Không thể tải danh sách việc làm';
      setError(errorMessage);
      handleApiError(e, 'generic', { silent: true });
    }
  }, []);

  const load_data_company = useCallback(async () => {
    console.log('🔵 load_data_company START');
    try {
      const companies = await companyApiService.getAllCompanies(12);
      console.log('🟢 load_data_company SUCCESS:', companies.length, 'companies');
      
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
      
      // Debug: Check image URLs
      console.log('🖼️ First company image:', normalizedCompanies[0]?.image);
      console.log('🖼️ Sample company data:', JSON.stringify(normalizedCompanies[0], null, 2));
      
      setDataCompany(normalizedCompanies);
    } catch (e: any) {
      console.error('🔴 load_data_company ERROR:', e.message);
      const errorMessage = e?.response?.data?.message || e?.message || 'Không thể tải danh sách công ty';
      setError(errorMessage);
      handleApiError(e, 'generic', { silent: true });
    }
  }, []);

  const load_data_categories = useCallback(async () => {
    console.log('🔵 load_data_categories START');
    try {
      const categories = await categoryApiService.getAllCategories(12);
      console.log('🟢 load_data_categories SUCCESS:', categories.length, 'categories');
      setDataCategories(categories);
    } catch (e: any) {
      console.error('🔴 load_data_categories ERROR:', e.message);
      const errorMessage = e?.response?.data?.message || e?.message || 'Không thể tải danh mục việc làm';
      setError(errorMessage);
      handleApiError(e, 'generic', { silent: true });
    }
  }, []);

  const loadUnreadNotifications = useCallback(async () => {
    if (!userId) {
      console.log('⚠️ loadUnreadNotifications SKIP: no userId');
      return;
    }
    console.log('🔵 loadUnreadNotifications START');
    try {
      const count = await notificationApiService.getUnreadCount();
      console.log('🟢 loadUnreadNotifications SUCCESS:', count);
      setUnreadCount(count);
    } catch (e: any) {
      console.error('🔴 loadUnreadNotifications ERROR:', e.message);
      // ✅ Silent fail for notifications - không quan trọng lắm
      // Không show error, không làm gián đoạn UX
    }
  }, [userId]);

  const loadAllData = useCallback(async (force = false) => {
    if (isLoadingRef.current) {
      console.log('⚠️ Already loading, skipping...');
      return;
    }
    
    // ✅ Check cache - skip nếu data còn fresh
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    if (!force && timeSinceLastLoad < CACHE_DURATION && dataJob.length > 0) {
      console.log(`⏭️ Using cached data (${Math.round(timeSinceLastLoad / 1000)}s old)`);
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
    } catch (e) {
      console.error('[useCandidateHome] loadAllData error:', e);
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
      if (selectedFilter === 'intern') {
        return type.includes('intern') || type.includes('thực tập');
      }
      if (selectedFilter === 'part-time') {
        return type.includes('part') || type.includes('bán thời gian');
      }
      if (selectedFilter === 'remote') {
        return type.includes('remote') || type.includes('từ xa');
      }
      return true;
    });
  }, [dataJob, selectedFilter]);

  const forYouJobs = useMemo(() => filteredJobs.slice(0, 5), [filteredJobs]);

  const latestJobs = useMemo(() => dataJob.slice(0, 6), [dataJob]);

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