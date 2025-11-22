import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { auth } from '@/config/firebase';
import * as Haptics from 'expo-haptics';
import { jobApiService } from '@/services/jobApi.service';
import { companyApiService } from '@/services/companyApi.service';
import { applicationApiService, Application } from '@/services/applicationApi.service';
import { Job, Company } from '@/types';
import { handleApiError, isPermissionError, isAuthError } from '@/utils/errorHandler';
import { isOfflineError, withOfflineHandling } from '@/utils/firestore.utils';

interface PosterInfo {
  name?: string;
  email?: string;
}

/**
 * Company type từ Job.company field
 * Có thể là string hoặc object với các properties
 */
type CompanyField = string | { 
  $id?: string; 
  corp_name?: string; 
  nation?: string; 
  city?: string; 
  email?: string;
} | undefined;

/**
 * Extract company name từ Job.company field
 * Type-safe helper function
 */
const getCompanyName = (company: CompanyField): string => {
  if (!company) return 'Ẩn danh';
  if (typeof company === 'string') return company;
  return company.corp_name || 'Ẩn danh';
};

/**
 * Extract company email từ Job.company field
 * Type-safe helper function
 */
const getCompanyEmail = (company: CompanyField): string | undefined => {
  if (!company || typeof company === 'string') return undefined;
  return company.email;
};

export const useJobDescription = (jobId: string) => {
  const [userId, setUserId] = useState<string>('');
  const [jobData, setJobData] = useState<Job | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [posterInfo, setPosterInfo] = useState<PosterInfo>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [applyLoading, setApplyLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [applyDocId, setApplyDocId] = useState<string | null>(null);

  const checkingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const u = auth.currentUser;
    setUserId(u?.uid || '');
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Load Job - Fixed race condition
   */
  const loadJobData = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      setError(null);

      const job = await withOfflineHandling(
        () => jobApiService.getJobById(jobId),
        null
      );
      
      if (!job) {
        if (!mountedRef.current) return;
        setError('Không thể tải công việc. Vui lòng kiểm tra kết nối mạng.');
        return;
      }
      
      if (!mountedRef.current) return;

      // ✅ Type-safe state update với explicit type cho prev parameter
      setJobData((prev: Job | null) => {
        // Prevent unnecessary re-renders nếu data không đổi
        if (prev && prev.id === job.id && prev.$id === job.$id) {
          // Check nếu data thực sự thay đổi
          const prevStr = JSON.stringify(prev);
          const jobStr = JSON.stringify(job);
          if (prevStr === jobStr) {
            return prev;
          }
        }
        return job;
      });

      // ✅ Fetch company data from companyId (for employer-created jobs)
      if (job.companyId) {
        try {
          const company = await withOfflineHandling(
            () => companyApiService.getCompanyById(job.companyId!),
            null
          );
          if (mountedRef.current && company) {
            setCompanyData(company);
          }
        } catch (companyError) {
          console.warn('⚠️ Could not fetch company:', companyError);
          // Continue without company data
        }
      }

      // ✅ Extract poster info với type-safe company handling
      if (job.employerId || job.ownerId) {
        const companyName = getCompanyName(job.company);
        const companyEmail = getCompanyEmail(job.company);
        
        setPosterInfo({
          name: companyName,
          email: companyEmail,
        });
      }
    } catch (e: any) {
      console.error('❌ Load job error:', e);
      if (mountedRef.current) {
        if (isOfflineError(e)) {
          setError('Không có kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
        } else {
          setError(e.message || 'Job không tồn tại hoặc đã bị xóa');
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [jobId]);

  /**
   * Check Apply Status - Debounced
   * Chỉ check nếu user đã login và là candidate (tránh 403 errors)
   * 
   * Note: API sẽ trả về 403 nếu user không phải candidate,
   * nên chúng ta handle error silently để không làm phiền user
   */
  const checkApplyStatus = useCallback(
    async (silent = false) => {
      // ✅ Guard: chỉ check nếu có userId và jobId, và không đang check
      if (!userId || !jobId || checkingRef.current) {
        // Reset state nếu không có userId
        if (!userId && mountedRef.current) {
          setApplyDocId(null);
          setIsApplied(false);
          setHasDraft(false);
        }
        return;
      }

      checkingRef.current = true;
      if (!silent) setApplyLoading(true);

      try {
        const applications = await applicationApiService.getMyApplications();
        const app = applications.find((a: Application) => a.jobId === jobId);

        if (!mountedRef.current) return;

        if (app) {
          const submitted = !!app.cvUrl;
          setApplyDocId(app.id || null);
          setIsApplied(submitted);
          setHasDraft(!submitted);
        } else {
          setApplyDocId(null);
          setIsApplied(false);
          setHasDraft(false);
        }
      } catch (e: any) {
        // ✅ Professional error handling:
        // - 403 Permission Denied: User không phải candidate hoặc chưa có role
        //   → Silent handling (không show error, chỉ reset state)
        // - 401 Unauthorized: Token expired hoặc chưa login
        //   → Silent handling (sẽ được handle ở auth flow)
        // - Other errors: Log với context (silent mode) hoặc show error
        if (isPermissionError(e)) {
          // 403: User không phải candidate - không phải lỗi, chỉ là không có quyền
          // Reset state để không hiển thị UI sai
          if (mountedRef.current) {
            setApplyDocId(null);
            setIsApplied(false);
            setHasDraft(false);
          }
          // Không log error trong production để tránh noise
          if (__DEV__) {
            console.log('ℹ️ Apply status check skipped: User is not a candidate');
          }
        } else if (isAuthError(e)) {
          // 401: Auth error - sẽ được handle ở auth flow
          if (mountedRef.current) {
            setApplyDocId(null);
            setIsApplied(false);
            setHasDraft(false);
          }
          if (__DEV__) {
            console.log('ℹ️ Apply status check skipped: User not authenticated');
          }
        } else {
          // Other errors - log với context
          if (__DEV__) {
            console.error('❌ Check applied error:', e);
          }
          // Trong non-silent mode, có thể show error nếu cần
          // Nhưng thường thì silent mode là đủ
        }
      } finally {
        if (mountedRef.current) {
          if (!silent) setApplyLoading(false);
          checkingRef.current = false;
        }
      }
    },
    [userId, jobId]
  );

  /**
   * Apply - Navigate to submit screen
   */
  const handleApply = useCallback(async () => {
    if (!userId) {
      Alert.alert('Thông báo', 'Bạn cần đăng nhập trước');
      return;
    }

    // ✅ Ngăn người dùng nộp lại nếu đã nộp CV
    if (isApplied) {
      Alert.alert(
        'Đã nộp CV',
        'Bạn đã nộp CV cho công việc này rồi. Vui lòng kiểm tra tại mục "Đơn ứng tuyển" để xem trạng thái.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setApplyLoading(true);

      if (hasDraft && applyDocId) {
        router.navigate(
          `/submit?jobId=${jobId}&userId=${userId}&applyDocId=${applyDocId}` as any
        );
        return;
      }

      if (!jobData) {
        Alert.alert('Lỗi', 'Không thể tải thông tin công việc');
        return;
      }

      // ✅ Validate employerId trước khi gửi request
      const employerId = jobData.employerId || jobData.ownerId;
      if (!employerId) {
        Alert.alert(
          'Không thể ứng tuyển',
          'Công việc này chưa có thông tin nhà tuyển dụng. Đây có thể là việc làm từ nguồn bên ngoài hoặc dữ liệu tạm thời.\\n\\nVui lòng thử các công việc khác hoặc liên hệ trực tiếp với công ty.',
          [{ text: 'Đóng' }]
        );
        if (__DEV__) {
          console.warn('⚠️ Job missing employerId:', {
            jobId: jobData.$id,
            title: jobData.title,
            source: jobData.source,
            jobSource: jobData.jobSource,
          });
        }
        return;
      }

      const newApplication = await applicationApiService.createApplication({
        jobId,
        employerId,
      });

      if (!mountedRef.current) return;

      setApplyDocId(newApplication.id || null);
      setHasDraft(true);
      router.navigate(
        `/submit?jobId=${jobId}&userId=${userId}&applyDocId=${newApplication.id}` as any
      );
    } catch (e: any) {
      // ✅ Handle 403 error (permission denied - user không phải candidate)
      if (isPermissionError(e)) {
        Alert.alert(
          'Không có quyền',
          'Chỉ ứng viên mới có thể ứng tuyển công việc. Vui lòng đăng nhập bằng tài khoản ứng viên.'
        );
        return;
      }
      
      // ✅ Handle 400 error (application đã tồn tại) - Reload status và thông báo
      if (e.response?.status === 400) {
        const errorMsg = e.response?.data?.message || e.message || '';
        
        if (errorMsg.includes('already applied')) {
          // Refresh lại trạng thái apply
          await checkApplyStatus(true);
          
          Alert.alert(
            'Đã nộp CV',
            'Bạn đã nộp CV cho công việc này rồi. Vui lòng kiểm tra tại mục "Đơn ứng tuyển".',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // ✅ Other errors
      console.error('❌ Apply failed:', e);
      handleApiError(e, 'apply_job', { silent: false });
    } finally {
      if (mountedRef.current) {
        setApplyLoading(false);
      }
    }
  }, [userId, jobId, jobData, hasDraft, applyDocId, isApplied, checkApplyStatus]);

  /**
   * Cancel application
   */
  const handleCancel = useCallback(async () => {
    if (!applyDocId) {
      Alert.alert('⚠️ Không tìm thấy hồ sơ ứng tuyển.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setLoading(true);
      await applicationApiService.withdrawApplication(applyDocId);

      if (!mountedRef.current) return;

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
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [applyDocId, checkApplyStatus]);

  /**
   * Delete Job (employer)
   */
  const handleDelete = useCallback(async () => {
    Alert.alert('Xóa công việc?', 'Mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await jobApiService.deleteJob(jobId);
            Alert.alert('✅ Đã xóa!', 'Công việc đã được xóa.');
            router.back();
          } catch (e: any) {
            console.error('❌ Delete error:', e);
            Alert.alert('Lỗi', 'Không thể xóa công việc. Vui lòng thử lại.');
          } finally {
            if (mountedRef.current) {
              setLoading(false);
            }
          }
        },
      },
    ]);
  }, [jobId]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadJobData(), checkApplyStatus(true)]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadJobData, checkApplyStatus]);

  // Initial load
  useEffect(() => {
    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  // ✅ Only check apply status if user is logged in
  // Note: checkApplyStatus sẽ tự handle permission errors silently
  useEffect(() => {
    if (userId && jobId) {
      // Delay một chút để đảm bảo role context đã load
      const timer = setTimeout(() => {
        checkApplyStatus(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [userId, jobId, checkApplyStatus]);

  // Prefetch submit screen
  useEffect(() => {
    if (jobId && userId) {
      try {
        router.prefetch(
          `/submit?jobId=${jobId}&userId=${userId}&applyDocId=${applyDocId ?? ''}` as any
        );
      } catch (err) {
        console.warn('Prefetch error:', err);
      }
    }
  }, [jobId, userId]);

  return {
    jobData,
    companyData,
    posterInfo,
    loading,
    error,
    applyLoading,
    isApplied,
    hasDraft,
    applyDocId,
    handleApply,
    handleCancel,
    handleDelete,
    refresh,
  };
};