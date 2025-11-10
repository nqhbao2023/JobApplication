// src/hooks/useJobDescription.ts
// Refactored: Sử dụng jobApiService và applicationApiService thay vì Firestore trực tiếp
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { storage, auth } from '@/config/firebase';
import * as Haptics from 'expo-haptics';
import { jobApiService } from '@/services/jobApi.service';
import { applicationApiService, Application } from '@/services/applicationApi.service';

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
  const [hasDraft, setHasDraft] = useState(false);        // Có application nhưng CHƯA có CV
  const [applyDocId, setApplyDocId] = useState<string | null>(null);

  const checkingRef = useRef(false);

  // Lấy user hiện tại
  useEffect(() => {
    const u = auth.currentUser;
    if (u) setUserId(u.uid);
    else setUserId('');
  }, []);

  /**
   * Load Job từ API
   * Flow: API getJobById → Set jobData → Load poster info (nếu cần)
   */
  const loadJobData = useCallback(async () => {
    if (!jobId || jobData) return;
    try {
      setLoading(true);
      setError(null);

      // ✅ Load job từ API
      const job = await jobApiService.getJobById(jobId);
      setJobData(job);

      // ✅ Load poster info từ job data
      // Backend có thể trả về employer info trong job object
      if (job.employerId || job.ownerId) {
        // TODO: Nếu backend có endpoint để lấy employer info, gọi ở đây
        // Hiện tại giữ nguyên logic cũ nếu cần
        setPosterInfo({
          name: job.company?.corp_name || job.company || 'Ẩn danh',
          email: job.company?.email || undefined,
        });
      }
    } catch (e: any) {
      console.error('❌ Load job error:', e);
      setError('Job không tồn tại hoặc đã bị xóa');
    } finally {
      setLoading(false);
    }
  }, [jobId, jobData]);

  /**
   * Check Apply Status từ API
   * Flow: API getMyApplications → Filter by jobId → Check CV status
   */
  const checkApplyStatus = useCallback(async (silent = false) => {
    if (!userId || !jobId || checkingRef.current) return;

    checkingRef.current = true;
    if (!silent) setApplyLoading(true);

    try {
      // ✅ Lấy applications từ API
      const applications = await applicationApiService.getMyApplications();
      const app = applications.find((a: Application) => a.jobId === jobId);

      if (app) {
        // Application tồn tại → Check xem đã có CV chưa
        const submitted = !!(app.cvUrl);
        
        setApplyDocId(app.id || null);
        setIsApplied(submitted);       // true khi đã có CV
        setHasDraft(!submitted);       // chưa có CV => draft
      } else {
        // Chưa có application
        setApplyDocId(null);
        setIsApplied(false);
        setHasDraft(false);
      }
    } catch (e: any) {
      console.error('❌ Check applied error:', e);
      // Nếu API fail (401, network error), không set state
    } finally {
      if (!silent) setApplyLoading(false);
      checkingRef.current = false;
    }
  }, [userId, jobId]);

  /**
   * Apply (tạo hoặc navigate đến submit screen)
   * Flow: Check draft → Navigate to submit với applyDocId
   * Note: Application sẽ được tạo ở submit screen khi upload CV
   */
  const handleApply = useCallback(async () => {
    if (!userId) {
      Alert.alert('Thông báo', 'Bạn cần đăng nhập trước');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setApplyLoading(true);

      // ✅ Nếu đã có draft application, navigate với applyDocId
      if (hasDraft && applyDocId) {
        router.navigate(`/submit?jobId=${jobId}&userId=${userId}&applyDocId=${applyDocId}` as any);
        return;
      }

      // ✅ Nếu chưa có application, tạo một application draft (chưa có CV)
      // Backend sẽ tạo application với status pending và không có CV
      if (!jobData) {
        Alert.alert('Lỗi', 'Không thể tải thông tin công việc');
        return;
      }

      try {
        const newApplication = await applicationApiService.createApplication({
          jobId,
          employerId: jobData.employerId || jobData.ownerId || '',
          // cvUrl và coverLetter sẽ được update ở submit screen
        });

        setApplyDocId(newApplication.id || null);
        setHasDraft(true);
        router.navigate(`/submit?jobId=${jobId}&userId=${userId}&applyDocId=${newApplication.id}` as any);
      } catch (apiError: any) {
        // Nếu application đã tồn tại, vẫn navigate với applyDocId nếu có
        if (apiError.response?.status === 400 && applyDocId) {
          router.navigate(`/submit?jobId=${jobId}&userId=${userId}&applyDocId=${applyDocId}` as any);
        } else {
          throw apiError;
        }
      }
    } catch (e: any) {
      console.error('❌ Apply failed:', e);
      Alert.alert('Lỗi', 'Không thể tạo hồ sơ ứng tuyển. Vui lòng thử lại.');
    } finally {
      setApplyLoading(false);
    }
  }, [userId, jobId, jobData, hasDraft, applyDocId]);

  /**
   * Cancel application (withdraw)
   * Flow: API withdrawApplication → Delete CV từ storage (nếu có) → Update state
   */
  const handleCancel = useCallback(async () => {
    if (!applyDocId) {
      Alert.alert('⚠️ Không tìm thấy hồ sơ ứng tuyển.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setLoading(true);

      // ✅ Lấy application để check CV path
      const applications = await applicationApiService.getMyApplications();
      const app = applications.find((a: Application) => a.id === applyDocId);

      // ✅ Xóa CV từ storage nếu có (nếu backend lưu path)
      // TODO: Backend có thể cần trả về CV path, hoặc handle deletion tự động
      // if (app?.cvUrl) {
      //   try {
      //     // Extract path from URL hoặc backend trả về path
      //     // await deleteObject(storageRef(storage, cvPath));
      //   } catch (err: any) {
      //     console.warn('Delete CV failed:', err?.message);
      //   }
      // }

      // ✅ Withdraw application qua API
      await applicationApiService.withdrawApplication(applyDocId);

      setIsApplied(false);
      setHasDraft(false);
      setApplyDocId(null);
      Alert.alert('✅ Thành công', 'Đã hủy ứng tuyển.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => checkApplyStatus(true), 300);
    } catch (e: any) {
      console.error('❌ Cancel failed:', e);
      Alert.alert('Lỗi', 'Không thể hủy ứng tuyển. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      checkApplyStatus(true);
    }
  }, [userId, jobId, applyDocId, checkApplyStatus]);

  /**
   * Delete Job (employer only)
   * Flow: API deleteJob → Backend xử lý xóa applications và saved jobs liên quan
   */
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

              // ✅ Delete job qua API (backend sẽ xử lý xóa applications và saved jobs)
              await jobApiService.deleteJob(jobId);

              Alert.alert('✅ Đã xóa!', 'Công việc đã được xóa.');
              router.back();
            } catch (e: any) {
              console.error('❌ Delete error:', e);
              Alert.alert('Lỗi', 'Không thể xóa công việc. Vui lòng thử lại.');
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
