// src/contexts/RoleContext.tsx
// ✅ Provider role toàn cục (Firestore + cache local + auto redirect)

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";

export type AppRole = 'candidate' | 'employer' | 'admin' | null;

type RoleContextType = {
  role: AppRole;
  loading: boolean;
  refresh: () => Promise<void>;
};

const RoleContext = createContext<RoleContextType>({
  role: null,
  loading: true,
  refresh: async () => {},
});

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setRole(null);
        await AsyncStorage.removeItem('userRole');
        return;
      }

      // ✅ B1: đọc cache trước
      if (!role) {
        const cached = await AsyncStorage.getItem('userRole');
        if (cached) setRole(cached as AppRole);
      }

      // ✅ B2: fetch Firestore
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists()) {
        setRole(null);
        await AsyncStorage.removeItem('userRole');
        return;
      }

      let r = (snap.data()?.role as string) || null;
      if (r === 'student') {
        await updateDoc(doc(db, 'users', user.uid), { role: 'candidate' });
        r = 'candidate';
      }

      if (r && ['candidate', 'employer', 'admin'].includes(r.toLowerCase())) {
        const normalized = r.toLowerCase() as AppRole;
        setRole(normalized);
        await AsyncStorage.setItem('userRole', normalized ?? '');

      } else {
        setRole(null);
        await AsyncStorage.removeItem('userRole');
      }
    } catch (e) {
      console.warn('⚠️ loadRole error:', e);
      const cached = await AsyncStorage.getItem('userRole');
      if (cached) setRole(cached as AppRole);
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
