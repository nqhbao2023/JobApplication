// src/contexts/RoleContext.tsx
// NEW: Provider role toàn cục (load 1 lần + migrate student->candidate)

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
export type AppRole = 'candidate' | 'employer' | 'admin' | null;

type RoleContextType = {
  role: AppRole;
  loading: boolean;
  refresh: () => Promise<void>;
};

const RoleContext = createContext<RoleContextType>({ role: null, loading: true, refresh: async () => {} });

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setRole(null);
        return;
      }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists()) {
        setRole(null);
        return;
      }
      let r = (snap.data()?.role as string) || null;

      // Migrate: student -> candidate
      if (r === 'student') {
        await updateDoc(doc(db, 'users', user.uid), { role: 'candidate' });
        r = 'candidate';
      }
      // Chuẩn hóa nhầm chữ hoa/thường
      if (r && ['candidate', 'employer', 'admin'].includes(r.toLowerCase())) {
        setRole(r.toLowerCase() as AppRole);
      } else {
        setRole(null);
      }
    } catch (e) {
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Gọi 1 lần khi app mount hoặc khi user thay đổi ở Layout
    loadRole();
  }, []);
  useEffect(() => {
  const unsub = onAuthStateChanged(auth, () => {
    loadRole(); // 🔁 user đổi → reload role
  });
  return unsub;
}, []);

  const value = useMemo(() => ({ role, loading, refresh: loadRole }), [role, loading]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => useContext(RoleContext);
