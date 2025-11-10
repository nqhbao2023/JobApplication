import React, { createContext, useContext, useState, useCallback } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { auth } from '@/config/firebase';
import { AppRole } from '@/types';
import { mapAuthError } from '@/utils/validation/auth';
import { useRole } from './RoleContext';
import { userApiService } from '@/services/userApi.service';

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

      const profile = await userApiService.getCurrentUser();
      if (profile.shouldRefreshToken) {
        await auth.currentUser?.getIdToken(true);
      }

      if (!profile.role) {
        await firebaseSignOut(auth);
        await AsyncStorage.removeItem('userRole');
        throw new Error('deleted-user');
      }

      await AsyncStorage.setItem('userRole', profile.role);
      await refreshRole();
    } catch (err: any) {
      if (err.message === 'deleted-user') {
        setError('Tài khoản của bạn đã bị xóa khỏi hệ thống. Vui lòng liên hệ quản trị viên.');
      } else {
        if (auth.currentUser) {
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('userRole');
        }

        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || 'Không thể đăng nhập. Vui lòng thử lại.');
        } else {
          setError(mapAuthError(err?.code));
        }
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
      await auth.currentUser?.getIdToken(true);

      const profile = await userApiService.bootstrapProfile({
        name: name.trim(),
        phone: phone.trim(),
        role,
      });

      if (profile.shouldRefreshToken) {
        await auth.currentUser?.getIdToken(true);
      }

      await AsyncStorage.setItem('userRole', profile.role);
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

      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
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