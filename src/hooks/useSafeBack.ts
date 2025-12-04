/**
 * useSafeBack - Custom hook để xử lý back navigation an toàn
 * 
 * Vấn đề: Khi navigate giữa các tab groups khác nhau trong expo-router,
 * router.canGoBack() có thể trả về false vì navigation stack bị reset.
 * 
 * Giải pháp: 
 * - Sử dụng `from` param để track nguồn gốc navigation
 * - Fallback về router.back() nếu có history
 * - Cuối cùng fallback về home dựa trên role
 */
import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useRole } from '@/contexts/RoleContext';

interface UseSafeBackOptions {
  /** Fallback route khi không có history */
  fallback?: string;
  /** Explicitly pass the 'from' param if already parsed */
  from?: string;
}

/**
 * Hook cung cấp hàm goBack() an toàn, hoạt động đúng giữa các tab groups
 * 
 * Usage:
 * ```tsx
 * const params = useLocalSearchParams<{ from?: string }>();
 * const { goBack } = useSafeBack({ from: params.from });
 * ```
 */
export const useSafeBack = (options?: UseSafeBackOptions) => {
  const { role: userRole } = useRole();
  // Lấy params từ hook nếu không được truyền explicitly
  const searchParams = useLocalSearchParams<{ from?: string }>();
  const fromParam = options?.from ?? searchParams.from;

  const goBack = useCallback(() => {
    // Debug log
    const canBack = router.canGoBack();
    console.log('[useSafeBack] canGoBack:', canBack, '| from param:', fromParam, '| role:', userRole);
    
    // ✅ Ưu tiên 1: Sử dụng `from` param nếu có (đảm bảo navigate đúng source)
    if (fromParam) {
      console.log('[useSafeBack] Using from param:', fromParam);
      router.replace(fromParam as any);
      return;
    }
    
    // ✅ Ưu tiên 2: Sử dụng router.back() nếu có history
    if (canBack) {
      console.log('[useSafeBack] Using router.back()');
      router.back();
      return;
    }

    // ✅ Ưu tiên 3: Fallback nếu có custom route
    if (options?.fallback) {
      console.log('[useSafeBack] Using fallback:', options.fallback);
      router.replace(options.fallback as any);
      return;
    }

    // ✅ Ưu tiên 4: Default fallback dựa trên role
    console.log('[useSafeBack] Using role-based fallback for role:', userRole);
    if (userRole === 'employer') {
      router.replace('/(employer)');
    } else if (userRole === 'candidate') {
      router.replace('/(candidate)');
    } else if (userRole === 'admin') {
      router.replace('/(admin)' as any);
    } else {
      router.replace('/');
    }
  }, [userRole, options?.fallback, fromParam]);

  const canGoBack = useCallback(() => {
    return router.canGoBack() || !!fromParam;
  }, [fromParam]);

  return { goBack, canGoBack };
};

export default useSafeBack;
