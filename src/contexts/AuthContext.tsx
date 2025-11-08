import React, { createContext, useContext, useState, useCallback } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/config/firebase';
import { AppRole, AppRoleOrNull } from '@/types';
import { mapAuthError } from '@/utils/validation/auth';
import { useRole } from './RoleContext';
import { getCurrentUserRole } from '@/utils/roles';

type AuthContextType = {
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, phone: string, email: string, password: string, role: AppRole) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshRole } = useRole();

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      
      const role = await getCurrentUserRole();
      if (!role) {
        await firebaseSignOut(auth);
        await AsyncStorage.removeItem('userRole');
        throw new Error('deleted-user');
      }

      await AsyncStorage.setItem('userRole', role);
      await refreshRole();
    } catch (err: any) {
      if (err.message === 'deleted-user') {
        setError('Tài khoản của bạn đã bị xóa khỏi hệ thống. Vui lòng liên hệ quản trị viên.');
      } else {
        if (auth.currentUser) {
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('userRole');
        }
        setError(mapAuthError(err?.code));
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRole]);

  const signUp = useCallback(async (
    name: string,
    phone: string,
    email: string,
    password: string,
    role: AppRole
  ) => {
    setLoading(true);
    setError(null);
    let userCreated = false;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      userCreated = true;

      await updateProfile(userCredential.user, { displayName: name.trim() });

      const writeUserDoc = setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: name.trim(),
        phone: phone.trim(),
        role,
        skills: [],
        savedJobIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      );

      await Promise.race([writeUserDoc, timeout]);
      await refreshRole();
    } catch (err: any) {
      if (userCreated) {
        try {
          await auth.currentUser?.delete();
          if (__DEV__) console.log('🧹 Cleaned up incomplete user account');
        } catch (deleteErr) {
          if (__DEV__) console.log('⚠️ Failed to delete incomplete user:', deleteErr);
        }
      }

      if (err?.message === 'timeout') {
        setError('Ghi dữ liệu quá lâu (timeout 15s). Kiểm tra mạng và thử lại.');
      } else if (err?.code === 'permission-denied') {
        setError('Không có quyền ghi dữ liệu. Vui lòng liên hệ hỗ trợ.');
      } else {
        setError(mapAuthError(err?.code));
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRole]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem('userRole');
      await refreshRole();
    } catch (err: any) {
      setError(mapAuthError(err?.code));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRole]);

  return (
    <AuthContext.Provider value={{ loading, error, signIn, signUp, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};