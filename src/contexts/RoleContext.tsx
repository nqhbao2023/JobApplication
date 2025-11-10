// src/contexts/RoleContext.tsx
// ✅ Provider role toàn cục (API + cache local + auto redirect)
// Refactored: Sử dụng authApiService thay vì Firestore trực tiếp

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from "firebase/auth";
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

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<AppRoleOrNull>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load role từ API backend
   * Flow: Cache local → API call → Update cache
   */
  const loadRole = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setRole(null);
        await AsyncStorage.removeItem('userRole');
        return;
      }

      // ✅ B1: Đọc cache trước để hiển thị ngay (offline-first)
      const cached = await AsyncStorage.getItem('userRole');
      if (cached && !role) {
        setRole(cached as AppRoleOrNull);
      }

      // ✅ B2: Gọi API để lấy role mới nhất từ backend
      try {
        const roleData = await authApiService.getCurrentRole();
        
        // Backend đã normalize role (student → candidate, isAdmin → admin)
        const normalizedRole = roleData.role;
        
        if (normalizedRole && ['candidate', 'employer', 'admin'].includes(normalizedRole.toLowerCase())) {
          const finalRole = normalizedRole.toLowerCase() as AppRoleOrNull;
          setRole(finalRole);
          await AsyncStorage.setItem('userRole', finalRole ?? '');
        } else {
          // User không có role hoặc bị xóa
          setRole(null);
          await AsyncStorage.removeItem('userRole');
        }
      } catch (apiError: any) {
        console.error('❌ Load role from API failed:', apiError);
        
        // Nếu API fail (network error, 401, etc.), dùng cache nếu có
        if (cached) {
          setRole(cached as AppRoleOrNull);
        } else {
          // Không có cache và API fail → set null
          setRole(null);
        }
      }
    } catch (e: any) {
      console.error('❌ Load role error:', e);
      // Fallback: dùng cache nếu có
      const cached = await AsyncStorage.getItem('userRole');
      if (cached) {
        setRole(cached as AppRoleOrNull);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔁 mount
  useEffect(() => {
    loadRole();
  }, []);

  // 🔁 khi login/logout
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      loadRole();
    });
    return unsub;
  }, []);

  // ✅ Auto redirect removed - handled by app/_layout.tsx to avoid conflicts

  const value = useMemo(() => ({ role, loading, refresh: loadRole }), [role, loading]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => useContext(RoleContext);
