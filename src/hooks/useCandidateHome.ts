import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { collection, getDocs, getDoc, query, where, doc, limit } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import * as Haptics from 'expo-haptics';

// ===== TYPES =====
export type Job = {
  $id: string;
  title?: string;
  image?: string;
  created_at?: string;
  company?: string | { $id?: string; corp_name?: string; nation?: string };
  jobCategories?: any;
  type?: string;
  salary?: string;
  location?: string;
};

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

export type CategoryWithCount = Category & { jobCount: number };

// ===== HOOK =====
export const useCandidateHome = () => {
  // ===== STATE =====
  const [userId, setUserId] = useState<string>('');
  const [dataJob, setDataJob] = useState<Job[]>([]);
  const [dataUser, setDataUser] = useState<any>();
  const [dataCategories, setDataCategories] = useState<Category[]>([]);
  const [dataCompany, setDataCompany] = useState<Company[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>('all');

  // ===== ANIMATION VALUES =====
  const scrollY = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  // ===== DATA LOADERS =====
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
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setDataUser({ $id: snap.id, ...snap.data() });
      }
    } catch (e) {
      console.error('load_data_user error:', e);
    }
  }, [userId]);

  const load_data_job = useCallback(async () => {
    try {
      const q = query(collection(db, 'jobs'), limit(30));
      const snap = await getDocs(q);
      let jobs = snap.docs.map(d => ({ $id: d.id, ...d.data() } as Job));
      // Sort by created_at descending
      jobs.sort((a, b) => (Date.parse(b.created_at || '0') || 0) - (Date.parse(a.created_at || '0') || 0));
      setDataJob(jobs);
    } catch (e) {
      console.error('load_data_job error:', e);
    }
  }, []);

  const load_data_company = useCallback(async () => {
    try {
      const q = query(collection(db, 'companies'), limit(12));
      const snap = await getDocs(q);
      const companies = snap.docs.map(d => ({ $id: d.id, ...d.data() } as Company));
      setDataCompany(companies);
    } catch (e) {
      console.error('load_data_company error:', e);
    }
  }, []);

  const load_data_categories = useCallback(async () => {
    try {
      const q = query(collection(db, 'job_categories'), limit(12));
      const snap = await getDocs(q);
      const categories = snap.docs.map(d => ({ $id: d.id, ...d.data() } as Category));
      setDataCategories(categories);
    } catch (e) {
      console.error('load_data_categories error:', e);
    }
  }, []);

  const loadUnreadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
      );
      const snap = await getDocs(q);
      setUnreadCount(snap.size);
    } catch (e) {
      console.error('loadUnreadNotifications error:', e);
    }
  }, [userId]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        load_data_user(),
        load_data_job(),
        load_data_company(),
        load_data_categories(),
        loadUnreadNotifications(),
      ]);
    } catch (e) {
      console.error('loadAllData error:', e);
    } finally {
      setLoading(false);
    }
  }, [load_data_user, load_data_job, load_data_company, load_data_categories, loadUnreadNotifications]);

  // ===== EFFECTS =====
  useEffect(() => {
    load_user_id();
  }, [load_user_id]);

  useEffect(() => {
    if (!userId) return;
    loadAllData();
  }, [userId, loadAllData]);

  // ===== HANDLERS =====
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  const handleFilterChange = useCallback((filter: QuickFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFilter(filter);
  }, []);

  const clearNotifications = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // ===== COMPUTED DATA =====
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
      // nearby filter not implemented yet
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

  // ===== RETURN =====
  return {
    // State
    userId,
    dataJob,
    dataUser,
    dataCategories,
    dataCompany,
    unreadCount,
    refreshing,
    loading,
    selectedFilter,
    
    // Animation values
    scrollY,
    hasTriggeredHaptic,
    
    // Computed data
    companyMap,
    categoryJobCounts,
    filteredJobs,
    forYouJobs,
    latestJobs,
    trendingCategories,
    
    // Methods
    getJobCompany,
    onRefresh,
    handleFilterChange,
    clearNotifications,
  };
};