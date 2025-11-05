import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import {
  doc, getDoc, collection, query, where, getDocs,
  addDoc, deleteDoc, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/config/firebase';
import * as Haptics from 'expo-haptics';

interface PosterInfo {
  name?: string;
  email?: string;
}

export const useJobDescription = (jobId: string) => {
  const [userId, setUserId] = useState<string>('');
  const [jobData, setJobData] = useState<any>(null);
  const [posterInfo, setPosterInfo] = useState<PosterInfo>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái apply
  const [applyLoading, setApplyLoading] = useState(true);
  const [isApplied, setIsApplied] = useState(false);      // ĐÃ có CV
  const [hasDraft, setHasDraft] = useState(false);        // Có doc nhưng CHƯA có CV
  const [applyDocId, setApplyDocId] = useState<string | null>(null);

  const checkingRef = useRef(false);

  // Lấy user hiện tại (đủ dùng với Expo/Firebase)
  useEffect(() => {
    const u = auth.currentUser;
    if (u) setUserId(u.uid);
    else setUserId('');
  }, []);

  // 1) Load Job
  const loadJobData = useCallback(async () => {
      if (!jobId || jobData) return;
    try {
      setLoading(true);
      setError(null);

      const jobRef = doc(db, 'jobs', jobId);
      const jobSnap = await getDoc(jobRef);
      if (!jobSnap.exists()) {
        setError('Job không tồn tại hoặc đã bị xóa');
        return;
      }

      const result = jobSnap.data();
      setJobData(result);

      if (result?.users?.id) {
        const userRef = doc(db, 'users', result.users.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const ud = userSnap.data();
          setPosterInfo({ name: ud.name, email: ud.email });
        }
      }
    } catch (e) {
      console.error('Load job error:', e);
      setError('Không thể tải thông tin job');
    } finally {
      setLoading(false);
    }
  }, [jobId, jobData]);

  // 2) Check Apply Status (chỉ coi là applied nếu đã có CV)
  const checkApplyStatus = useCallback(async (silent = false) => {
    if (!userId || !jobId || checkingRef.current) return;

    checkingRef.current = true;
    if (!silent) setApplyLoading(true);

    try {
      const qy = query(
        collection(db, 'applied_jobs'),
        where('userId', '==', userId),
        where('jobId', '==', jobId)
      );
      const res = await getDocs(qy);

      if (!res.empty) {
        const first = res.docs[0];
        const data = first.data();
        const submitted = !!(data?.cv_url || data?.cv_uploaded);

        setApplyDocId(first.id);
        setIsApplied(submitted);       // true khi đã có CV
        setHasDraft(!submitted);       // chưa có CV => draft
      } else {
        setApplyDocId(null);
        setIsApplied(false);
        setHasDraft(false);
      }
    } catch (e) {
      console.error('Check applied error:', e);
    } finally {
      if (!silent) setApplyLoading(false);
      checkingRef.current = false;
    }
  }, [userId, jobId]);

  // 3) Apply (KHÔNG setIsApplied(true) ở đây)
  const handleApply = useCallback(async () => {
    if (!userId) {
      Alert.alert('Thông báo', 'Bạn cần đăng nhập trước');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setApplyLoading(true);

      // Nếu đã có draft thì dùng lại doc đó
if (hasDraft && applyDocId) {
  router.navigate(`/submit?jobId=${jobId}&userId=${userId}&applyDocId=${applyDocId}` as any);
  return;
}


      // Xóa bản cũ (nếu có) để tránh trùng
      const qy = query(
        collection(db, 'applied_jobs'),
        where('userId', '==', userId),
        where('jobId', '==', jobId)
      );
      const res = await getDocs(qy);
      await Promise.all(res.docs.map(d => deleteDoc(d.ref)));

      // Tạo doc DRAFT (chưa có CV)
      const created = await addDoc(collection(db, 'applied_jobs'), {
        userId,
        jobId,
        employerId: jobData?.users?.id ?? jobData?.ownerId ?? '',
        cv_uploaded: false,
        cv_url: null,
        status: 'pending',
        applied_at: serverTimestamp(),
        jobInfo: {
          title: jobData?.title || '',
          company: jobData?.company?.corp_name || '',
          salary: jobData?.salary || '',
        },
      });

      setApplyDocId(created.id);
      setHasDraft(true);    // Có draft
      // Không đổi isApplied ở đây
router.navigate(`/submit?jobId=${jobId}&userId=${userId}&applyDocId=${created.id}` as any);
    } catch (e) {
      console.error('Apply failed:', e);
      Alert.alert('Lỗi', 'Không thể tạo hồ sơ ứng tuyển.');
    } finally {
      setApplyLoading(false);
    }
  }, [userId, jobId, jobData, hasDraft, applyDocId]);

  // 4) Cancel (chỉ thực sự hủy khi người dùng bấm Cancel)
  const handleCancel = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setLoading(true);

      const qy = query(
        collection(db, 'applied_jobs'),
        where('userId', '==', userId),
        where('jobId', '==', jobId)
      );
      const res = await getDocs(qy);

      if (res.empty) {
        Alert.alert('⚠️ Không tìm thấy hồ sơ ứng tuyển.');
        return;
      }

      for (const snap of res.docs) {
        const data = snap.data();
        if (data?.cv_path) {
          try {
            await deleteObject(storageRef(storage, data.cv_path));
          } catch (err: any) {
            console.warn('Delete CV failed:', err?.message);
          }
        }
        await deleteDoc(snap.ref);
      }

      setIsApplied(false);
      setHasDraft(false);
      setApplyDocId(null);
      Alert.alert('✅ Thành công', 'Đã hủy ứng tuyển.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => checkApplyStatus(true), 300);
    } catch (e) {
      console.error('Cancel failed:', e);
      Alert.alert('Lỗi', 'Không thể hủy ứng tuyển.');
    } finally {
      setLoading(false);
      checkApplyStatus(true);
    }
  }, [userId, jobId, checkApplyStatus]);

  // 5) Delete Job (employer)
  const handleDelete = useCallback(async () => {
    Alert.alert(
      'Xóa công việc?',
      'Mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const jobRef = doc(db, 'jobs', jobId);
              const appliedQuery = query(collection(db, 'applied_jobs'), where('jobId', '==', jobId));
              const savedQuery = query(collection(db, 'saved_jobs'), where('jobId', '==', jobId));

              const [appliedSnap, savedSnap] = await Promise.all([
                getDocs(appliedQuery),
                getDocs(savedQuery),
              ]);

              const batch = writeBatch(db);
              batch.delete(jobRef);
              appliedSnap.forEach(d => batch.delete(d.ref));
              savedSnap.forEach(d => batch.delete(d.ref));
              await batch.commit();

              Alert.alert('✅ Đã xóa!', 'Công việc đã được xóa.');
              router.back();
            } catch (e) {
              console.error('Delete error:', e);
              Alert.alert('Lỗi', 'Không thể xóa.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [jobId]);

  // 6) Refresh
const refresh = useCallback(async () => {
  setLoading(true);
  try {
    await Promise.all([loadJobData(), checkApplyStatus(true)]);
  } finally {
    setLoading(false);
  }
}, [loadJobData, checkApplyStatus]);

  // Mount
  useEffect(() => {
    loadJobData();
  }, [loadJobData]);

  useEffect(() => {
    if (userId && jobId) checkApplyStatus(false);
  }, [userId, jobId, checkApplyStatus]);
  // ✅ Prefetch màn hình submit để tăng tốc khi người dùng nhấn "Ứng tuyển"
  useEffect(() => {
    if (jobId && userId) {
      try {
        // Prefetch trước route submit — Expo Router sẽ tải layout & bundle trước
router.prefetch(
  `/submit?jobId=${jobId}&userId=${userId}&applyDocId=${applyDocId ?? ""}`
);
        console.log('⚡ Prefetch submit screen:', jobId);
      } catch (err) {
        console.warn('Prefetch error:', err);
      }
    }
  }, [jobId, userId]);

  // Cho JD dùng
  return {
    jobData,
    posterInfo,
    loading,
    error,

    // apply states
    applyLoading,
    isApplied,      // chỉ true khi đã có CV
    hasDraft,       // có doc nhưng chưa có CV
    applyDocId,

    // actions
    handleApply,
    handleCancel,
    handleDelete,
    refresh,
  };
};
