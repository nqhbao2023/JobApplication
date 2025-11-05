// src/hooks/useCandidateHome.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

/* ------------ TYPES ------------ */
export type Job = {
  $id: string;
  title?: string;
  image?: string;
  created_at?: string;
  company?: string | { $id?: string; corp_name?: string; nation?: string };
  jobCategories?: any;
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

/* ------------ HOOK ------------ */
export const useCandidateHome = () => {
  /* ---------- state ---------- */
  const [userId, setUserId] = useState('');
  const [dataJob, setDataJob] = useState<Job[]>([]);
  const [dataUser, setDataUser] = useState<any>();
  const [dataCategories, setDataCategories] = useState<Category[]>([]);
  const [dataCompany, setDataCompany] = useState<Company[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------- loaders ---------- */
  const load_user_id = async () => {
    const user = auth.currentUser;
    if (user) setUserId(user.uid);
  };

  const load_data_user = async () => {
    if (!userId) return;
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) setDataUser({ $id: snap.id, ...snap.data() });
  };

  const load_data_job = async () => {
    const snap = await getDocs(query(collection(db, 'jobs')));
    setDataJob(snap.docs.map((d) => ({ $id: d.id, ...d.data() } as Job)));
  };

  const load_data_company = async () => {
    const snap = await getDocs(query(collection(db, 'companies')));
    setDataCompany(snap.docs.map((d) => ({ $id: d.id, ...d.data() } as Company)));
  };

  const load_data_categories = async () => {
    const snap = await getDocs(query(collection(db, 'job_categories')));
    setDataCategories(
      snap.docs.map((d) => ({ $id: d.id, ...d.data() } as Category)),
    );
  };

  const loadUnreadNotifications = async () => {
    if (!userId) return;
    const snap = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
      ),
    );
    setUnreadCount(snap.size);
  };

  /* ---------- effects ---------- */
  useEffect(() => {
    load_user_id();
  }, []);

  useEffect(() => {
    if (!userId) return;
    load_data_user();
    load_data_job();
    load_data_company();
    load_data_categories();
    loadUnreadNotifications();
  }, [userId]);

  /* ---------- refresh ---------- */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      load_user_id(),
      load_data_user(),
      load_data_job(),
      load_data_company(),
      load_data_categories(),
      loadUnreadNotifications(),
    ]).finally(() => setRefreshing(false));
  }, [userId]);

  /* ---------- helpers ---------- */
  const companyMap = useMemo(() => {
    const map: Record<string, Company> = {};
    dataCompany.forEach((c) => (map[c.$id] = c));
    return map;
  }, [dataCompany]);

  const getJobCompany = (job: Job) => {
    if (!job.company) return undefined;
    if (typeof job.company === 'string') return companyMap[job.company];
    if (typeof job.company === 'object' && job.company.$id)
      return companyMap[job.company.$id];
    return undefined;
  };

  const jobsSorted = useMemo(() => {
    return [...dataJob].sort(
      (a, b) =>
        (Date.parse(b.created_at || '0') || 0) -
        (Date.parse(a.created_at || '0') || 0),
    );
  }, [dataJob]);

  const getJobCountByCategory = (categoryId: string) => {
    const catName = dataCategories.find((c) => c.$id === categoryId)
      ?.category_name;
    return dataJob.filter((job) => {
      const jc = job.jobCategories;
      if (!jc) return false;
      if (typeof jc === 'string') return jc === categoryId || jc === catName;
      if (Array.isArray(jc) && typeof jc[0] === 'string')
        return jc.some((x) => x === categoryId || x === catName);
      if (Array.isArray(jc)) return jc.some((x: any) => x?.$id === categoryId);
      if (typeof jc === 'object' && jc.$id) return jc.$id === categoryId;
      return false;
    }).length;
  };

  const getContrastColor = (hex = '') => {
    if (!hex.startsWith('#') || hex.length < 7) return '#1e293b';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? '#000' : '#FFF';
  };

  /* ---------- return ---------- */
  return {
    /* data */
    dataUser,
    dataCompany,
    dataCategories,
    dataJob,
    unreadCount,
    refreshing,
    /* helpers */
    jobsSorted,
    getJobCompany,
    getJobCountByCategory,
    getContrastColor,
    /* actions */
    onRefresh,
  };
};
