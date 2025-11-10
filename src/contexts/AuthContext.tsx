import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/config/firebase';
import { AppRole } from '@/types';
import { mapAuthError } from '@/utils/validation/auth';
import { useRole } from './RoleContext';
import { authApiService } from '@/services/authApi.service';

type AuthContextType = {
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    phone: string,
    email: string,
    password: string,
    role: AppRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshRole } = useRole();

  const clearError = useCallback(() => setError(null), []);

  /**
   * Sign In with improved error handling
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Firebase login
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        // Step 2: Verify with backend
        try {
          const roleData = await authApiService.getCurrentRole();

          if (!roleData.role) {
            throw new Error('deleted-user');
          }

          // Step 3: Cache role
          await AsyncStorage.setItem('userRole', roleData.role);
          await refreshRole();
        } catch (apiError: any) {
          console.error('❌ Backend verification failed:', apiError);

          // Rollback authentication
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('userRole');

          if (apiError.response?.status === 401) {
            throw new Error('session-expired');
          }
          throw apiError;
        }
      } catch (err: any) {
        console.error('❌ Sign in error:', err);

        const errorMessages: Record<string, string> = {
          'deleted-user': 'Tài khoản của bạn đã bị xóa. Liên hệ admin để biết thêm chi tiết.',
          'session-expired': 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
          'network-request-failed': 'Không thể kết nối server. Kiểm tra internet và thử lại.',
        };

        setError(errorMessages[err.message] || mapAuthError(err?.code));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshRole]
  );

  /**
   * Sign Up with atomic transaction
   */
  const signUp = useCallback(
    async (
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
        // Step 1: Create Firebase account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        userCreated = true;

        // Step 2: Update display name
        await updateProfile(userCredential.user, {
          displayName: name.trim(),
        });

        // Step 3: Sync with backend
        try {
          await authApiService.syncUser({
            uid: userCredential.user.uid,
            email: userCredential.user.email!,
            name: name.trim(),
            phone: phone.trim(),
            role,
          });

          // Step 4: Refresh role
          await refreshRole();
        } catch (apiError: any) {
          console.error('❌ Backend sync failed:', apiError);

          // Rollback: Delete Firebase user
          try {
            await auth.currentUser?.delete();
            console.log('🧹 Cleaned up incomplete user account');
          } catch (deleteErr) {
            console.warn('⚠️ Failed to delete incomplete user:', deleteErr);
          }

          throw new Error('Backend sync failed. Account creation rolled back.');
        }
      } catch (err: any) {
        console.error('❌ Sign up error:', err);

        // Cleanup on error
        if (userCreated && auth.currentUser) {
          try {
            await auth.currentUser.delete();
            console.log('🧹 Cleaned up incomplete user account');
          } catch (deleteErr) {
            console.warn('⚠️ Failed to delete incomplete user:', deleteErr);
          }
        }

        if (err?.message?.includes('Backend sync failed')) {
          setError('Không thể đồng bộ dữ liệu. Vui lòng thử lại.');
        } else {
          setError(mapAuthError(err?.code));
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshRole]
  );

  /**
   * Sign Out
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('userRole');
      await firebaseSignOut(auth);
      await refreshRole();
    } catch (err: any) {
      console.error('❌ Sign out error:', err);
      setError(mapAuthError(err?.code));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRole]);

  return (
    <AuthContext.Provider
      value={{
        loading,
        error,
        signIn,
        signUp,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};