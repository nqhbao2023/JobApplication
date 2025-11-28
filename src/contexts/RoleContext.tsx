import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRoleOrNull } from '@/types';
import { authApiService } from '@/services/authApi.service';

type RoleContextType = {
  role: AppRoleOrNull;
  loading: boolean;
  refresh: () => Promise<void>;
};

const RoleContext = createContext<RoleContextType>({
  role: null,
  loading: true,
  refresh: async () => {},
});

const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const ROLE_CACHE_KEY = 'userRole';
const ROLE_TIMESTAMP_KEY = 'roleTimestamp';
const MIN_FETCH_INTERVAL = 3000; // Minimum 3 seconds between API calls

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<AppRoleOrNull>(null);
  const [loading, setLoading] = useState(true);

  // ✅ useRef để giữ giá trị role mới nhất và tracking state
  const roleRef = useRef<AppRoleOrNull>(null);
  const lastFetchTime = useRef<number>(0);
  const isFetching = useRef<boolean>(false);
  
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  /**
   * Load role with cache invalidation and rate limiting
   */
  const loadRole = useCallback(async () => {
    // Rate limiting - prevent multiple rapid calls
    const now = Date.now();
    if (now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
      console.log('ℹ️ Skipping role fetch (rate limited)');
      return;
    }
    
    // Prevent concurrent fetches
    if (isFetching.current) {
      console.log('ℹ️ Skipping role fetch (already fetching)');
      return;
    }
    
    isFetching.current = true;
    lastFetchTime.current = now;
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      
      if (!user) {
        setRole(null);
        await AsyncStorage.multiRemove([ROLE_CACHE_KEY, ROLE_TIMESTAMP_KEY]);
        return;
      }

      // Check cache first
      const [cached, timestamp] = await AsyncStorage.multiGet([
        ROLE_CACHE_KEY,
        ROLE_TIMESTAMP_KEY,
      ]);

      const cachedRole = cached[1];
      const cacheTimestamp = timestamp[1];
      const cacheAge = cacheTimestamp
        ? Date.now() - parseInt(cacheTimestamp)
        : Infinity;

      // Use cache immediately if valid
      if (cachedRole && cacheAge < CACHE_MAX_AGE) {
        setRole(cachedRole as AppRoleOrNull);
        // If cache is very fresh (< 30s), skip API call
        if (cacheAge < 30000) {
          console.log('📦 Using fresh cached role, skipping API');
          return;
        }
      }

      // Fetch from backend
      try {
        const roleData = await authApiService.getCurrentRole();
        const normalizedRole = roleData.role ? roleData.role.toLowerCase() as AppRoleOrNull : null;

        if (normalizedRole && ['candidate', 'employer', 'admin'].indexOf(normalizedRole) >= 0) {
          setRole(normalizedRole);
          await AsyncStorage.multiSet([
            [ROLE_CACHE_KEY, normalizedRole],
            [ROLE_TIMESTAMP_KEY, Date.now().toString()],
          ]);
        } else if (!cachedRole) {
          // Only clear if no cache backup
          setRole(null);
        }
      } catch (apiError: any) {
        // Silent handle - use cache if available
        const status = apiError?.response?.status;
        if (status !== 401 && status !== 403) {
          console.warn('⚠️ Role API error, using cache:', apiError.message);
        }
        // Keep current role or use cache
        if (!roleRef.current && cachedRole) {
          setRole(cachedRole as AppRoleOrNull);
        }
      }
    } catch (e: any) {
      console.error('❌ Load role error:', e);
      // Final fallback to cache
      try {
        const cached = await AsyncStorage.getItem(ROLE_CACHE_KEY);
        if (cached && !roleRef.current) {
          setRole(cached as AppRoleOrNull);
        }
      } catch (cacheErr) {
        // Ignore cache errors
      }
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  }, []);

  // ✅ Initial mount - load cached role first, then fetch
  useEffect(() => {
    // Load cached role immediately for faster UI
    AsyncStorage.getItem(ROLE_CACHE_KEY).then((cached) => {
      if (cached) {
        setRole(cached as AppRoleOrNull);
      }
    });
    // Then fetch fresh role
    loadRole();
  }, [loadRole]);

  // ✅ Listen to auth state changes with debounce
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const unsub = onAuthStateChanged(auth, (user) => {
      // Clear any pending debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      if (user) {
        // Debounce role fetch to avoid multiple rapid calls
        debounceTimer = setTimeout(() => {
          loadRole();
        }, 500);
      } else {
        setRole(null);
        setLoading(false);
        AsyncStorage.multiRemove([ROLE_CACHE_KEY, ROLE_TIMESTAMP_KEY]);
      }
    });
    
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsub();
    };
  }, [loadRole]);

  // ✅ 3. Background refresh every 5 minutes - thêm loadRole vào dependency
  useEffect(() => {
    const interval = setInterval(() => {
      if (auth.currentUser) {
        loadRole(); // ✅ Luôn gọi phiên bản loadRole mới nhất
      }
    }, CACHE_MAX_AGE);

    return () => clearInterval(interval);
  }, [loadRole]); // ✅ Thêm dependency

  const value = useMemo(
    () => ({ role, loading, refresh: loadRole }),
    [role, loading, loadRole]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => useContext(RoleContext);