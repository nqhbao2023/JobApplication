/**
 * useSafeBack - Custom hook để xử lý back navigation an toàn
 * 
 * Vấn đề: Khi navigate giữa các tab groups khác nhau trong expo-router,
 * router.canGoBack() và navigation.canGoBack() có thể trả về true 
 * nhưng back() không quay về đúng trang vì navigation stack không được 
 * maintain đúng cách giữa các tab groups.
 * 
 * Giải pháp: 
 * - ƯU TIÊN sử dụng `from` param để navigate về đúng trang nguồn
 * - Chỉ dùng goBack() khi không có `from` param và canGoBack() = true
 * - Fallback về home dựa trên role
 */
import { useCallback, useRef } from 'react';
import { router, useLocalSearchParams, useSegments } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation();
  // Lấy params từ hook nếu không được truyền explicitly
  const searchParams = useLocalSearchParams<{ from?: string }>();
  const fromParam = options?.from ?? searchParams.from;
  const segments = useSegments();
  
  // Debounce để tránh double navigation
  const lastNavigationTimeRef = useRef(0);

  const goBack = useCallback(() => {
    // Debounce: prevent rapid navigation calls (within 300ms)
    const now = Date.now();
    if (now - lastNavigationTimeRef.current < 300) {
      console.log('[useSafeBack] Debounced - too soon since last navigation');
      return;
    }
    lastNavigationTimeRef.current = now;
    
    const canBack = navigation.canGoBack();
    const routerCanBack = router.canGoBack();
    console.log('[useSafeBack] navigation.canGoBack:', canBack, '| router.canGoBack:', routerCanBack, '| from param:', fromParam, '| role:', userRole);
    
    // ✅ ƯU TIÊN 1: Sử dụng `from` param nếu có
    // Đây là cách đáng tin cậy nhất vì expo-router không maintain đúng stack giữa tab groups
    if (fromParam) {
      console.log('[useSafeBack] Using from param:', fromParam);
      router.replace(fromParam as any);
      return;
    }
    
    // ✅ Ưu tiên 2: Dùng navigation.goBack() nếu có history và KHÔNG có from param
    // Trường hợp này chỉ xảy ra khi navigate trong cùng một tab group
    if (canBack) {
      console.log('[useSafeBack] Using navigation.goBack() (no from param)');
      navigation.goBack();
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
  }, [userRole, options?.fallback, fromParam, navigation]);

  const canGoBack = useCallback(() => {
    return navigation.canGoBack() || !!fromParam;
  }, [fromParam, navigation]);

  return { goBack, canGoBack };
};

export default useSafeBack;
