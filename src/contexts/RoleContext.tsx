import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
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

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<AppRoleOrNull>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load role with cache invalidation
   */
  const loadRole = useCallback(async () => {
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      
      if (!user) {
        setRole(null);
        await AsyncStorage.multiRemove([ROLE_CACHE_KEY, ROLE_TIMESTAMP_KEY]);
        return;
      }

      // Check cache age
      const [cached, timestamp] = await AsyncStorage.multiGet([
        ROLE_CACHE_KEY,
        ROLE_TIMESTAMP_KEY,
      ]);

      const cachedRole = cached[1];
      const cacheTimestamp = timestamp[1];
      const cacheAge = cacheTimestamp
        ? Date.now() - parseInt(cacheTimestamp)
        : Infinity;

      // Use cache if fresh and available
      if (cachedRole && cacheAge < CACHE_MAX_AGE && !role) {
        setRole(cachedRole as AppRoleOrNull);
      }

      // Always fetch from backend to check for updates
      try {
        const roleData = await authApiService.getCurrentRole();
        const normalizedRole = roleData.role?.toLowerCase() as AppRoleOrNull;

        // Detect role change
        if (normalizedRole !== cachedRole) {
          console.log('🔄 Role changed:', cachedRole, '→', normalizedRole);
        }

        if (normalizedRole && ['candidate', 'employer', 'admin'].includes(normalizedRole)) {
          setRole(normalizedRole);
          await AsyncStorage.multiSet([
            [ROLE_CACHE_KEY, normalizedRole],
            [ROLE_TIMESTAMP_KEY, Date.now().toString()],
          ]);
        } else {
          // No role or deleted user
          setRole(null);
          await AsyncStorage.multiRemove([ROLE_CACHE_KEY, ROLE_TIMESTAMP_KEY]);
        }
      } catch (apiError: any) {
        console.error('❌ Load role from API failed:', apiError);

        // Use cache only if fresh
        if (cachedRole && cacheAge < CACHE_MAX_AGE) {
          console.log('📦 Using cached role due to API error');
          setRole(cachedRole as AppRoleOrNull);
        } else {
          setRole(null);
        }
      }
    } catch (e: any) {
      console.error('❌ Load role error:', e);
      
      // Final fallback
      try {
        const cached = await AsyncStorage.getItem(ROLE_CACHE_KEY);
        if (cached) setRole(cached as AppRoleOrNull);
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [role]);

  // Initial mount
  useEffect(() => {
    loadRole();
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadRole();
      } else {
        setRole(null);
        setLoading(false);
        AsyncStorage.multiRemove([ROLE_CACHE_KEY, ROLE_TIMESTAMP_KEY]);
      }
    });
    
    return unsub;
  }, []);

  // Background refresh every 5 minutes if user is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (auth.currentUser) {
        loadRole();
      }
    }, CACHE_MAX_AGE);

    return () => clearInterval(interval);
  }, []);

  const value = useMemo(
    () => ({ role, loading, refresh: loadRole }),
    [role, loading, loadRole]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => useContext(RoleContext);