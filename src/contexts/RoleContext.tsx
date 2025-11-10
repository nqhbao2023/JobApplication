// src/contexts/RoleContext.tsx
// ✅ Provider role toàn cục (REST API + cache local)

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { auth } from '@/config/firebase';
import { AppRoleOrNull } from '@/types';
import { userApiService } from '@/services/userApi.service';
import { normalizeRole } from '@/utils/roles';

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

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<AppRoleOrNull>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = useCallback(async () => {
    setLoading(true);
    const cached = await AsyncStorage.getItem('userRole');

    if (cached) {
      setRole(normalizeRole(cached));
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setRole(null);
        await AsyncStorage.removeItem('userRole');
        return;
      }

      const profile = await userApiService.getCurrentUser();
      const normalizedRole = normalizeRole(profile.role);

      if (profile.shouldRefreshToken) {
        await user.getIdToken(true);
      }

      if (normalizedRole) {
        setRole(normalizedRole);
        await AsyncStorage.setItem('userRole', normalizedRole);
      } else {
        setRole(null);
        await AsyncStorage.removeItem('userRole');
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          if (cached) {
            setRole(normalizeRole(cached));
          }
        } else if (error.response.status === 404) {
          setRole(null);
          await AsyncStorage.removeItem('userRole');
        } else if (error.response.status === 401) {
          setRole(null);
          await AsyncStorage.removeItem('userRole');
        } else {
          console.error('[RoleContext] loadRole error', error.response.data);
        }
      } else {
        console.error('[RoleContext] loadRole error', error);
        if (cached) {
          setRole(normalizeRole(cached));
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔁 mount
  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // 🔁 khi login/logout
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      loadRole();
    });
    return unsub;
  }, [loadRole]);

  // ✅ Auto redirect removed - handled by app/_layout.tsx to avoid conflicts

  const value = useMemo(() => ({ role, loading, refresh: loadRole }), [role, loading, loadRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => useContext(RoleContext);
